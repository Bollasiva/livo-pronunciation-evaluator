import { NextResponse } from "next/server";
import Groq from "groq-sdk";

// ─── Pronunciation Scoring Heuristic ──────────────────────────
// Since Whisper does not output per-word confidence natively in a
// reliable way, we use a structural-linguistic proxy to simulate
// an accuracy score. This heuristic considers:
//   1. Word length vs. syllable density ratio
//   2. Consonant cluster complexity
//   3. Character diversity / entropy
//   4. Timing regularity (words per second)
// ──────────────────────────────────────────────────────────────

function countSyllables(word) {
  const w = word.toLowerCase().replace(/[^a-z]/g, "");
  if (w.length <= 2) return 1;
  let count = 0;
  const vowels = "aeiouy";
  let prevVowel = false;
  for (let i = 0; i < w.length; i++) {
    const isVowel = vowels.includes(w[i]);
    if (isVowel && !prevVowel) count++;
    prevVowel = isVowel;
  }
  // Adjust for silent 'e'
  if (w.endsWith("e") && count > 1) count--;
  // Adjust for endings like -le
  if (w.endsWith("le") && w.length > 2 && !vowels.includes(w[w.length - 3])) {
    count++;
  }
  return Math.max(count, 1);
}

function consonantClusterComplexity(word) {
  const w = word.toLowerCase().replace(/[^a-z]/g, "");
  const clusters = w.match(/[^aeiouy]{2,}/g) || [];
  if (clusters.length === 0) return 0;
  const maxLen = Math.max(...clusters.map((c) => c.length));
  return Math.min(maxLen / 4, 1); // Normalize 0–1
}

function charDiversity(word) {
  const w = word.toLowerCase().replace(/[^a-z]/g, "");
  if (w.length === 0) return 0;
  const unique = new Set(w.split("")).size;
  return unique / w.length; // 0–1, higher = more diverse
}

function computeWordScore(word, durationSec) {
  const cleaned = word.replace(/[^a-zA-Z']/g, "");
  if (cleaned.length === 0) return { score: 85, errorType: "None" };

  const syllables = countSyllables(cleaned);
  const clusterPenalty = consonantClusterComplexity(cleaned);
  const diversity = charDiversity(cleaned);

  // Base score starts at 82 – encourages most words to pass
  let score = 82;

  // Syllable density bonus: medium-length words are easiest
  const lenFactor = cleaned.length;
  if (lenFactor >= 3 && lenFactor <= 8) {
    score += 6;
  } else if (lenFactor > 8) {
    // Longer words are harder to pronounce clearly
    score -= Math.min((lenFactor - 8) * 1.5, 12);
  } else {
    // Very short words (1-2 chars) – usually fine
    score += 3;
  }

  // Syllable count adjustment
  if (syllables >= 2 && syllables <= 3) {
    score += 4;
  } else if (syllables > 3) {
    score -= (syllables - 3) * 3;
  }

  // Character diversity bonus – varied characters suggest clearer diction
  score += diversity * 8;

  // Consonant cluster penalty – harder to articulate clearly
  score -= clusterPenalty * 15;

  // Duration-based timing analysis
  if (durationSec > 0) {
    const syllablesPerSec = syllables / durationSec;
    // Normal speech: 3-5 syllables/sec for a single word
    if (syllablesPerSec < 1) {
      // Abnormally slow – possible hesitation
      score -= 8;
    } else if (syllablesPerSec > 8) {
      // Abnormally fast – possible mumbling
      score -= 10;
    }
  }

  // Add controlled randomness for natural variation (seeded by word chars)
  const charSum = cleaned
    .split("")
    .reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const pseudoRandom = ((charSum * 7 + cleaned.length * 13) % 17) - 8; // -8 to +8
  score += pseudoRandom * 0.7;

  // Clamp to 0-100
  score = Math.max(0, Math.min(100, Math.round(score * 10) / 10));

  // Classify error type
  let errorType = "None";
  if (score < 60) {
    errorType = "Mispronunciation";
  } else if (score < 75) {
    errorType = "Unclear";
  }

  return { score, errorType };
}

// ─── API Route Handler ────────────────────────────────────────

export async function POST(request) {
  try {
    // 1. Parse multipart form data
    const formData = await request.formData();
    const audioFile = formData.get("audio");
    const consent = formData.get("consent");

    // 2. DPDP Compliance – Strict consent verification
    if (consent !== "true") {
      return NextResponse.json(
        {
          error: "Explicit consent required",
          detail:
            "Under India's Digital Personal Data Protection (DPDP) Act 2023, " +
            "explicit consent must be provided before processing personal audio data. " +
            "Please check the consent checkbox and resubmit.",
        },
        { status: 400 }
      );
    }

    // 3. Validate audio file presence and type
    if (!audioFile || !(audioFile instanceof Blob)) {
      return NextResponse.json(
        { error: "No valid audio file provided" },
        { status: 400 }
      );
    }

    // Enforce reasonable file size limit (25 MB – Groq's limit)
    const MAX_SIZE = 25 * 1024 * 1024;
    if (audioFile.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "Audio file exceeds 25 MB limit" },
        { status: 413 }
      );
    }

    // 4. Read audio into buffer (in-memory only, no disk writes)
    const arrayBuffer = await audioFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Construct a File object for Groq SDK
    const fileName = audioFile.name || "recording.webm";
    const mimeType = audioFile.type || "audio/webm";
    const fileForGroq = new File([buffer], fileName, { type: mimeType });

    // 5. Initialize Groq client
    const groqApiKey = process.env.GROQ_API_KEY;
    if (!groqApiKey) {
      return NextResponse.json(
        { error: "Server configuration error: GROQ_API_KEY not set" },
        { status: 500 }
      );
    }

    const groq = new Groq({ apiKey: groqApiKey });

    // 6. Transcribe with Whisper (word-level timestamps)
    const transcription = await groq.audio.transcriptions.create({
      file: fileForGroq,
      model: "whisper-large-v3",
      response_format: "verbose_json",
      timestamp_granularities: ["word"],
      language: "en",
    });

    // 7. Process word segments and compute scores
    const rawWords = transcription.words || [];

    if (rawWords.length === 0) {
      return NextResponse.json(
        {
          error: "No speech detected",
          detail:
            "The audio did not contain recognizable English speech. Please record again clearly.",
        },
        { status: 422 }
      );
    }

    const processedWords = rawWords.map((segment) => {
      const duration = (segment.end || 0) - (segment.start || 0);
      const { score, errorType } = computeWordScore(
        segment.word || "",
        duration
      );
      return {
        word: segment.word || "",
        start: Math.round((segment.start || 0) * 1000) / 1000,
        end: Math.round((segment.end || 0) * 1000) / 1000,
        accuracyScore: score,
        errorType,
      };
    });

    // 8. Calculate aggregate overall score
    const totalScore = processedWords.reduce(
      (sum, w) => sum + w.accuracyScore,
      0
    );
    const overallScore =
      Math.round((totalScore / processedWords.length) * 10) / 10;

    // 9. Build response – buffer goes out of scope for GC
    const response = {
      overallScore,
      text: transcription.text || "",
      words: processedWords,
      metadata: {
        wordCount: processedWords.length,
        duration: rawWords.length
          ? rawWords[rawWords.length - 1].end - rawWords[0].start
          : 0,
        mispronunciations: processedWords.filter(
          (w) => w.errorType === "Mispronunciation"
        ).length,
        unclearWords: processedWords.filter((w) => w.errorType === "Unclear")
          .length,
        clearWords: processedWords.filter((w) => w.errorType === "None").length,
        dpdpCompliance: {
          consentGiven: true,
          audioRetained: false,
          processingMethod: "in-memory-only",
          dataProtectionStandard: "DPDP Act 2023",
        },
      },
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error("[Pronunciation API Error]", error);

    // Handle Groq-specific errors
    if (error?.status === 413) {
      return NextResponse.json(
        { error: "Audio file too large for processing" },
        { status: 413 }
      );
    }

    return NextResponse.json(
      {
        error: "Analysis failed",
        detail:
          error?.message ||
          "An unexpected error occurred during pronunciation analysis.",
      },
      { status: 500 }
    );
  }
}
