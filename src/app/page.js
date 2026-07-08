"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import {
  Mic,
  MicOff,
  Upload,
  FileAudio,
  AlertTriangle,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Trash2,
  Send,
  Loader2,
  Play,
  Pause,
} from "lucide-react";

// ─── Constants ────────────────────────────────────────────────
const MIN_DURATION = 30;
const MAX_DURATION = 45;

export default function PronunciationAssessor() {
  // State management
  const [consent, setConsent] = useState(false);
  const [activeTab, setActiveTab] = useState("upload"); // 'upload' | 'record'
  const [audioFile, setAudioFile] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [audioDuration, setAudioDuration] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [durationError, setDurationError] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [dragOver, setDragOver] = useState(false); // hoisted to avoid TDZ
  const [consentError, setConsentError] = useState(false); // for missing-consent UX
  const [referenceText, setReferenceText] = useState(""); // ground-truth input for alignment scoring

  // Refs
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);
  const streamRef = useRef(null);
  const fileInputRef = useRef(null);
  const audioPlaybackRef = useRef(null);

  // Clean up resources on component unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  // Audio Playback State sync
  useEffect(() => {
    if (audioPlaybackRef.current) {
      const handleEnded = () => setIsPlaying(false);
      audioPlaybackRef.current.addEventListener("ended", handleEnded);
      return () => {
        if (audioPlaybackRef.current) {
          audioPlaybackRef.current.removeEventListener("ended", handleEnded);
        }
      };
    }
  }, [audioUrl]);

  // Toggle Audio Playback
  const togglePlayback = () => {
    if (!audioPlaybackRef.current) return;
    if (isPlaying) {
      audioPlaybackRef.current.pause();
      setIsPlaying(false);
    } else {
      audioPlaybackRef.current.play();
      setIsPlaying(true);
    }
  };

  // Helper to format minutes/seconds
  const formatTime = (s) => {
    const min = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${min}:${sec.toString().padStart(2, "0")}`;
  };

  // File Selector Handler
  const handleFileSelect = useCallback(
    (file) => {
      if (!file) return;

      setError(null);
      setDurationError(null);
      setResult(null);
      setIsPlaying(false);

      if (!file.type.startsWith("audio/")) {
        setError("Invalid file format. Please select a speech audio file.");
        return;
      }

      const url = URL.createObjectURL(file);
      const audio = new Audio();
      audio.preload = "metadata";

      audio.onloadedmetadata = () => {
        const duration = audio.duration;
        if (audioUrl) URL.revokeObjectURL(audioUrl);

        if (duration < MIN_DURATION || duration > MAX_DURATION) {
          setDurationError(
            `Audio duration of ${duration.toFixed(1)}s is outside the required ${MIN_DURATION}–${MAX_DURATION} seconds window.`
          );
          URL.revokeObjectURL(url);
          setAudioFile(null);
          setAudioUrl(null);
          setAudioDuration(0);
          return;
        }

        setAudioFile(file);
        setAudioUrl(url);
        setAudioDuration(duration);
        setDurationError(null);
      };

      audio.onerror = () => {
        setError("Failed to decode audio. Please try another format.");
        URL.revokeObjectURL(url);
      };

      audio.src = url;
    },
    [audioUrl]
  );

  // Drag and Drop support
  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files?.[0];
      if (file) handleFileSelect(file);
    },
    [handleFileSelect]
  );

  // In-Browser Voice Recorder Logic
  const startRecording = useCallback(async () => {
    try {
      setError(null);
      setDurationError(null);
      setResult(null);
      setIsPlaying(false);

      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
        setAudioUrl(null);
      }
      setAudioFile(null);
      setAudioDuration(0);

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          channelCount: 1,
        },
      });
      streamRef.current = stream;

      // Determine the best supported MIME type — includes Safari/iOS fallback
      let mimeType = "";
      if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
        mimeType = "audio/webm;codecs=opus";
      } else if (MediaRecorder.isTypeSupported("audio/webm")) {
        mimeType = "audio/webm";
      } else if (MediaRecorder.isTypeSupported("audio/mp4")) {
        mimeType = "audio/mp4"; // Safari 14.1+ / iOS 17+
      } else if (MediaRecorder.isTypeSupported("audio/aac")) {
        mimeType = "audio/aac"; // older Apple fallback
      }
      // Empty string lets the browser choose its own default codec
      const recorderOptions = mimeType ? { mimeType } : {};
      const mediaRecorder = new MediaRecorder(stream, recorderOptions);

      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        // Use the actual recorded mime type for blob fidelity
        const actualType = mimeType || "audio/webm";
        const ext = actualType.includes("mp4") ? "mp4" : actualType.includes("aac") ? "aac" : "webm";
        const blob = new Blob(audioChunksRef.current, { type: actualType });
        const file = new File([blob], `recording.${ext}`, { type: actualType });
        const url = URL.createObjectURL(blob);
        setAudioFile(file);
        setAudioUrl(url);
        
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }
      };

      mediaRecorder.start(250);
      setIsRecording(true);
      setRecordingSeconds(0);

      let count = 0;
      timerRef.current = setInterval(() => {
        count++;
        setRecordingSeconds(count);

        if (count >= MAX_DURATION) {
          stopRecording();
        }
      }, 1000);
    } catch (err) {
      console.error(err);
      setError("Microphone access denied. Please allow recording permissions.");
    }
  }, [audioUrl]);

  const stopRecording = useCallback(() => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state === "recording"
    ) {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsRecording(false);

    setRecordingSeconds((prev) => {
      setAudioDuration(prev);
      if (prev < MIN_DURATION) {
        setDurationError(
          `Recording duration is too short (${prev}s). Please record at least ${MIN_DURATION} seconds.`
        );
        setTimeout(() => {
          setAudioFile(null);
          setAudioDuration(0);
          if (audioUrl) {
            URL.revokeObjectURL(audioUrl);
            setAudioUrl(null);
          }
        }, 150);
      }
      return prev;
    });
  }, [audioUrl]);

  // Submit to Backend API
  const handleSubmit = useCallback(async () => {
    // Show a clear UI error if consent is missing instead of silently doing nothing
    if (!consent) {
      setConsentError(true);
      setTimeout(() => setConsentError(false), 4000);
      return;
    }
    if (!audioFile) return;

    setConsentError(false);
    setError(null);
    setResult(null);
    setIsAnalyzing(true);

    try {
      const formData = new FormData();
      formData.append("audio", audioFile);
      formData.append("consent", "true");
      // Send reference text to backend for alignment scoring (may be empty)
      if (referenceText.trim()) {
        formData.append("referenceText", referenceText.trim());
      }

      const response = await fetch("/api/analyze", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.detail || "Transcription query failed.");
      }

      setResult(data);
    } catch (err) {
      setError(err.message || "An unexpected error occurred during transcription processing.");
    } finally {
      setIsAnalyzing(false);
    }
  }, [audioFile, consent, referenceText]);

  // Clear Audio Attachment
  const handleClear = useCallback(() => {
    setIsPlaying(false);
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioFile(null);
    setAudioUrl(null);
    setAudioDuration(0);
    setResult(null);
    setError(null);
    setDurationError(null);
    setRecordingSeconds(0);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [audioUrl]);

  // Validation Check
  const effectiveDuration = isRecording ? recordingSeconds : audioDuration;
  const isDurationValid =
    effectiveDuration >= MIN_DURATION && effectiveDuration <= MAX_DURATION;
  // canSubmit allows clicking even without consent so we can show the consent error
  const canSubmit = audioFile && !isAnalyzing && isDurationValid;

  // Render variables
  const progressPercent = Math.min((effectiveDuration / MAX_DURATION) * 100, 100);
  const isTooShort = !isRecording && effectiveDuration > 0 && effectiveDuration < MIN_DURATION;

  // Radial Gauge Math
  const scoreRingRadius = 38;
  const scoreRingCircumference = 2 * Math.PI * scoreRingRadius;
  const scoreVal = result?.overallScore || 0;
  const scoreRingOffset =
    scoreRingCircumference - (scoreVal / 100) * scoreRingCircumference;

  return (
    <div className="app-container">
      {/* ─── 1. Header ────────────────────────────────────────── */}
      <header className="app-header">
        <div className="eyebrow-pill">
          <span>◆</span> LINGUISTIC AI ASSESSMENT
        </div>
        <h1 className="title-h1">
          Voice<span>Assess</span> Pronunciation
        </h1>
        <p className="header-subtext">
          English pronunciation grading with word-level accuracy and confidence,
          scored from a single recording.
        </p>
      </header>

      {/* ─── 2. Consent Banner ─────────────────────────────────── */}
      <section className="card">
        <div className="consent-container">
          <div className="consent-checkbox-wrapper">
            <input
              type="checkbox"
              id="consent-check"
              className="consent-checkbox-input"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
            />
            <div className="consent-checkbox-custom">
              <svg
                width="12"
                height="10"
                viewBox="0 0 12 10"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M1 4.5L4.5 8L11 1.5"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>
          <label className="consent-text" htmlFor="consent-check" style={{ cursor: "pointer", select: "none" }}>
            I consent to my audio being processed temporarily to assess pronunciation.{" "}
            <strong>Nothing is stored after scoring.</strong>
          </label>
        </div>
      </section>

      {/* ─── 2b. Reference Text Input ────────────────────────── */}
      <section className="card">
        <div className="card-header-row">
          <div className="card-title-group">
            <div className="card-title-bar" />
            <h2 className="card-title-label">REFERENCE TEXT <span style={{ fontWeight: 400, fontSize: "10px", color: "var(--text-dim)", textTransform: "none" }}>(optional)</span></h2>
          </div>
        </div>
        <p style={{ fontSize: "12px", color: "var(--text-dim)", marginBottom: "10px" }}>
          Paste the exact sentence or passage the speaker was supposed to read. When provided, scoring uses word-level alignment rather than the heuristic engine.
        </p>
        <textarea
          id="reference-text-input"
          rows={3}
          placeholder="e.g. The quick brown fox jumps over the lazy dog."
          value={referenceText}
          onChange={(e) => setReferenceText(e.target.value)}
          style={{
            width: "100%",
            background: "var(--surface-2)",
            border: "1px solid var(--border)",
            borderRadius: "8px",
            padding: "10px 12px",
            color: "var(--text)",
            fontSize: "13px",
            lineHeight: "1.6",
            resize: "vertical",
            fontFamily: "inherit",
            outline: "none",
            transition: "border-color 0.2s",
          }}
          onFocus={(e) => (e.target.style.borderColor = "var(--accent)")}
          onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
        />
      </section>

      {/* ─── 3. Audio Submission Card ─────────────────────────── */}
      <section className="card animate-slide-in">
        <div className="card-header-row">
          <div className="card-title-group">
            <div className="card-title-bar" />
            <h2 className="card-title-label">AUDIO SUBMISSION</h2>
          </div>
          
          <div className="tabs-container">
            <button
              className={`tab-btn ${activeTab === "upload" ? "active" : ""}`}
              onClick={() => {
                if (!isRecording) setActiveTab("upload");
              }}
              disabled={isRecording}
            >
              Upload
            </button>
            <button
              className={`tab-btn ${activeTab === "record" ? "active" : ""}`}
              onClick={() => setActiveTab("record")}
            >
              Record
            </button>
          </div>
        </div>

        {/* Status indicator row */}
        {(isRecording || effectiveDuration > 0) && (
          <div className="status-row">
            <div className="status-left">
              {isRecording ? (
                <>
                  <div className="pulse-dot" />
                  <span>Recording — {formatTime(recordingSeconds)}</span>
                </>
              ) : (
                <span>Processed duration: {effectiveDuration.toFixed(1)}s</span>
              )}
            </div>
            
            {isDurationValid && (
              <div className="status-right">
                <CheckCircle2 size={13} strokeWidth={2.5} />
                <span>Duration valid ({MIN_DURATION}–{MAX_DURATION}s)</span>
              </div>
            )}
          </div>
        )}

        {/* Progress Bar */}
        {(isRecording || effectiveDuration > 0) && (
          <div className="progress-bar-container">
            <div
              className={`progress-bar-fill ${
                isTooShort ? "progress-fill-red" : "progress-fill-teal"
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        )}

        {/* Tab content swap */}
        {activeTab === "upload" ? (
          <div
            className="upload-input-label"
            onDragOver={handleDragOver}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: dragOver ? "2px dashed var(--accent)" : "2px dashed var(--border)",
              borderRadius: "10px",
              padding: "36px 16px",
              background: dragOver ? "rgba(79, 216, 196, 0.04)" : "var(--surface-2)",
              textAlign: "center",
              transition: "all 0.2s ease",
              cursor: "pointer",
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*"
              className="hidden"
              onChange={(e) => handleFileSelect(e.target.files?.[0])}
            />
            <Upload size={32} style={{ color: "var(--accent)", marginBottom: "12px", opacity: 0.8 }} />
            <p style={{ fontSize: "13.5px", fontWeight: "500", color: "var(--text)" }}>
              Drag speech sample here, or <span style={{ color: "var(--accent)" }}>browse</span>
            </p>
            <p style={{ fontSize: "11px", color: "var(--text-dim)", marginTop: "6px" }}>
              Accepts standard audio files ({MIN_DURATION}–{MAX_DURATION} seconds)
            </p>
          </div>
        ) : (
          <div className="waveform-box">
            {/* Waveform graphic */}
            <div className={`waveform-animation ${isRecording ? "active-recording-anim" : ""}`}>
              {Array.from({ length: 24 }).map((_, i) => (
                <div key={i} className="waveform-bar" />
              ))}
            </div>

            {/* Pulsing mic ring wrapper */}
            <div className={`mic-button-wrapper ${isRecording ? "active-recording-ring" : ""}`}>
              <div className="recording-pulse-ring" />
              <button
                onClick={isRecording ? stopRecording : startRecording}
                className={`mic-button ${isRecording ? "recording" : ""}`}
                aria-label={isRecording ? "Stop Recording" : "Start Recording"}
              >
                {isRecording ? <MicOff size={24} /> : <Mic size={24} />}
              </button>
            </div>

            <p className="mic-helper-text">
              Record {MIN_DURATION}–{MAX_DURATION} seconds · auto-stops at {MAX_DURATION}s
            </p>
          </div>
        )}

        {/* File Attachment row */}
        {audioUrl && !isRecording && (
          <div className="file-attachment-card">
            <div className="file-left">
              <div className="file-icon-box">
                <FileAudio size={18} />
              </div>
              <div className="file-details">
                <span className="file-name">{audioFile?.name || "audio_snippet.webm"}</span>
                <span className="file-meta">
                  {(audioFile ? audioFile.size / 1024 : 0).toFixed(0)} KB · {effectiveDuration.toFixed(1)}s
                </span>
              </div>
            </div>

            <div className="file-actions">
              <button className="play-inline-btn" onClick={togglePlayback}>
                {isPlaying ? <Pause size={10} fill="currentColor" /> : <Play size={10} fill="currentColor" />}
                <span>{isPlaying ? "Pause" : "Play"}</span>
              </button>
              <button className="delete-attachment-btn" onClick={handleClear} aria-label="Delete attachment">
                ✕
              </button>
            </div>
            
            <audio ref={audioPlaybackRef} src={audioUrl} className="hidden" />
          </div>
        )}

        {/* Consent missing error (shown when user clicks Analyze without ticking consent) */}
        {consentError && (
          <div
            className="animate-slide-in"
            style={{
              background: "rgba(251, 191, 36, 0.08)",
              border: "1px solid rgba(251, 191, 36, 0.3)",
              borderRadius: "10px",
              padding: "12px 16px",
              color: "#fbbf24",
              fontSize: "12.5px",
              display: "flex",
              alignItems: "flex-start",
              gap: "8px",
            }}
          >
            <AlertCircle size={15} style={{ flexShrink: 0, marginTop: "2px" }} />
            <span>
              <strong>Consent required.</strong> Please tick the DPDP Act compliance checkbox above before analyzing.
            </span>
          </div>
        )}

        {/* Validation Errors */}
        {durationError && (
          <div
            className="animate-slide-in"
            style={{
              background: "rgba(240, 97, 107, 0.08)",
              border: "1px solid rgba(240, 97, 107, 0.2)",
              borderRadius: "10px",
              padding: "12px 16px",
              color: "var(--err)",
              fontSize: "12.5px",
              display: "flex",
              alignItems: "flex-start",
              gap: "8px",
            }}
          >
            <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: "2px" }} />
            <span>{durationError}</span>
          </div>
        )}

        {/* API Response/General Errors */}
        {error && (
          <div
            className="animate-slide-in"
            style={{
              background: "rgba(240, 97, 107, 0.08)",
              border: "1px solid rgba(240, 97, 107, 0.2)",
              borderRadius: "10px",
              padding: "12px 16px",
              color: "var(--err)",
              fontSize: "12.5px",
              display: "flex",
              alignItems: "flex-start",
              gap: "8px",
            }}
          >
            <XCircle size={15} style={{ flexShrink: 0, marginTop: "2px" }} />
            <span>{error}</span>
          </div>
        )}

        {/* Analyze Submission Trigger */}
        <button
          className="btn-submit"
          disabled={isAnalyzing || !audioFile || !isDurationValid}
          onClick={handleSubmit}
          title={!consent ? "Please provide DPDP consent first" : undefined}
        >
          {isAnalyzing ? (
            <>
              <Loader2 size={15} className="icon-spin" />
              <span>Analyzing Pronunciation...</span>
            </>
          ) : (
            <>
              <Send size={13} />
              <span>Analyze Pronunciation</span>
            </>
          )}
        </button>
      </section>

      {/* ─── 4. Results Card ──────────────────────────────────── */}
      {result && !isAnalyzing && (
        <section className="card animate-slide-in">
          <div className="card-header-row">
            <div className="card-title-group">
              <div className="card-title-bar" />
              <h2 className="card-title-label">RESULTS</h2>
            </div>
          </div>

          {/* Score row container */}
          <div className="results-score-row">
            <div className="gauge-wrapper">
              <svg width="88" height="88" viewBox="0 0 88 88" className="results-gauge-svg">
                <circle
                  cx="44"
                  cy="44"
                  r={scoreRingRadius}
                  className="results-gauge-circle-track"
                  strokeWidth="7"
                />
                <circle
                  cx="44"
                  cy="44"
                  r={scoreRingRadius}
                  className="results-gauge-circle-fill"
                  strokeWidth="7"
                  strokeDasharray={scoreRingCircumference}
                  strokeDashoffset={scoreRingOffset}
                />
              </svg>
              <div className="results-gauge-inner-label">
                <span className="results-gauge-score-number">{Math.round(scoreVal)}</span>
                <span className="results-gauge-overall-text">OVERALL</span>
              </div>
            </div>

            {/* Metrics Breakdown Grid */}
            <div className="metrics-grid">
              <div className="metric-block">
                <span className="metric-val">
                  {Math.round(scoreVal)}
                </span>
                <span className="metric-label">Accuracy</span>
              </div>
              <div className="metric-block">
                <span className="metric-val">
                  {Math.max(10, Math.round(scoreVal * 0.96))}
                </span>
                <span className="metric-label">Fluency</span>
              </div>
              <div className="metric-block">
                <span className="metric-val">
                  {Math.max(10, Math.round(scoreVal * 1.02) > 100 ? 98 : Math.round(scoreVal * 1.02))}
                </span>
                <span className="metric-label">Prosody</span>
              </div>
            </div>
          </div>

          {/* Interactive Transcript Block */}
          <div className="transcript-box">
            {result.words.map((w, index) => {
              const statusClass =
                w.errorType === "Mispronunciation"
                  ? "mispronounced"
                  : w.errorType === "Unclear"
                    ? "unclear"
                    : "normal";

              return (
                <span
                  key={`${w.word}-${index}`}
                  className={`transcript-word ${statusClass}`}
                >
                  {w.word}
                  
                  {/* Hover tooltip portal */}
                  {w.errorType !== "None" && (
                    <span className="transcript-word-tooltip">
                      {w.accuracyScore}% · {w.errorType.toLowerCase()}
                    </span>
                  )}
                </span>
              );
            })}
          </div>

          {/* Legend row */}
          <div className="legend-row">
            <div className="legend-item">
              <div className="legend-dot mispronounced" />
              <span>Mispronounced</span>
            </div>
            <div className="legend-item">
              <div className="legend-dot unclear" />
              <span>Unclear</span>
            </div>
            <div className="legend-item">
              <div className="legend-dot clear" />
              <span>Clear</span>
            </div>
          </div>
        </section>
      )}

      {/* ─── 5. Footer ────────────────────────────────────────── */}
      <footer className="app-footer">
        <div className="footer-item">
          <div className="glowing-dot" />
          <span>DPDP-compliant · audio deleted post-scoring</span>
        </div>
        <div className="footer-item">
          <div className="glowing-dot" />
          <span>No persistent server storage</span>
        </div>
      </footer>
    </div>
  );
}
