"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import {
  Mic,
  MicOff,
  Upload,
  FileAudio,
  AlertTriangle,
  Shield,
  ShieldCheck,
  Activity,
  Clock,
  BarChart3,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Trash2,
  Send,
  Volume2,
  Loader2,
} from "lucide-react";

// ─── Constants ────────────────────────────────────────────────
const MIN_DURATION = 30;
const MAX_DURATION = 45;

// ─── Fluency Level Mapper ─────────────────────────────────────
function getFluencyLevel(score) {
  if (score >= 90) return { label: "Excellent", color: "#34d399", tier: "A+" };
  if (score >= 80) return { label: "Very Good", color: "#6ee7b7", tier: "A" };
  if (score >= 70) return { label: "Good", color: "#fbbf24", tier: "B+" };
  if (score >= 60) return { label: "Fair", color: "#f59e0b", tier: "B" };
  if (score >= 50) return { label: "Needs Work", color: "#f87171", tier: "C" };
  return { label: "Poor", color: "#ef4444", tier: "D" };
}

// ─── Score Gauge Component ────────────────────────────────────
function ScoreGauge({ score, animate }) {
  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const fluency = getFluencyLevel(score);

  const getStrokeColor = () => {
    if (score >= 80) return "url(#gaugeGradientGreen)";
    if (score >= 60) return "url(#gaugeGradientAmber)";
    return "url(#gaugeGradientRed)";
  };

  return (
    <div className="gauge-container mx-auto">
      <svg
        className="gauge-svg"
        width="200"
        height="200"
        viewBox="0 0 200 200"
      >
        <defs>
          <linearGradient
            id="gaugeGradientGreen"
            x1="0%"
            y1="0%"
            x2="100%"
            y2="100%"
          >
            <stop offset="0%" stopColor="#059669" />
            <stop offset="100%" stopColor="#34d399" />
          </linearGradient>
          <linearGradient
            id="gaugeGradientAmber"
            x1="0%"
            y1="0%"
            x2="100%"
            y2="100%"
          >
            <stop offset="0%" stopColor="#d97706" />
            <stop offset="100%" stopColor="#fbbf24" />
          </linearGradient>
          <linearGradient
            id="gaugeGradientRed"
            x1="0%"
            y1="0%"
            x2="100%"
            y2="100%"
          >
            <stop offset="0%" stopColor="#dc2626" />
            <stop offset="100%" stopColor="#f87171" />
          </linearGradient>
        </defs>
        <circle className="gauge-track" cx="100" cy="100" r={radius} />
        <circle
          className="gauge-fill"
          cx="100"
          cy="100"
          r={radius}
          stroke={getStrokeColor()}
          strokeDasharray={circumference}
          strokeDashoffset={animate ? offset : circumference}
        />
      </svg>
      <div className="gauge-score">
        <span className="gauge-score-number" style={{ color: fluency.color }}>
          {animate ? Math.round(score) : 0}
        </span>
        <span className="gauge-score-label">Overall Score</span>
      </div>
    </div>
  );
}

// ─── Token Span Component ─────────────────────────────────────
function TokenSpan({ word, accuracyScore, errorType, start, end }) {
  const classMap = {
    Mispronunciation: "token-mispronunciation",
    Unclear: "token-unclear",
    None: "token-none",
  };

  const labelMap = {
    Mispronunciation: "Mispronunciation",
    Unclear: "Unclear Pronunciation",
    None: "Clear",
  };

  const iconMap = {
    Mispronunciation: <XCircle size={12} className="inline mr-1" />,
    Unclear: <AlertCircle size={12} className="inline mr-1" />,
    None: <CheckCircle2 size={12} className="inline mr-1" />,
  };

  return (
    <span className={`token ${classMap[errorType] || "token-none"}`}>
      {word}
      <span className="token-tooltip">
        <div className="flex items-center gap-2 mb-1">
          {iconMap[errorType]}
          <span className="font-semibold">
            {labelMap[errorType] || "Clear"}
          </span>
        </div>
        <div
          className="text-xs mt-1"
          style={{ color: "var(--text-secondary)" }}
        >
          Score:{" "}
          <span className="font-bold" style={{ color: "var(--text-primary)" }}>
            {accuracyScore}%
          </span>
        </div>
        <div
          className="text-xs"
          style={{ color: "var(--text-muted)", fontSize: "0.7rem" }}
        >
          {start.toFixed(2)}s – {end.toFixed(2)}s
        </div>
      </span>
    </span>
  );
}

// ─── Recording Timer Display ──────────────────────────────────
function RecordingTimer({ seconds }) {
  const radius = 24;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(seconds / MAX_DURATION, 1);
  const offset = circumference - progress * circumference;

  const isInRange = seconds >= MIN_DURATION && seconds <= MAX_DURATION;
  const isNearMax = seconds >= MAX_DURATION - 5 && seconds < MAX_DURATION;

  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  return (
    <div className="flex items-center gap-3">
      <div className="relative w-14 h-14 flex items-center justify-center">
        <svg width="56" height="56" viewBox="0 0 56 56" className="-rotate-90">
          <circle
            cx="28"
            cy="28"
            r={radius}
            fill="none"
            stroke="rgba(99, 102, 241, 0.1)"
            strokeWidth="3"
          />
          <circle
            cx="28"
            cy="28"
            r={radius}
            fill="none"
            stroke={isNearMax ? "#f87171" : isInRange ? "#34d399" : "#818cf8"}
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="timer-ring"
          />
        </svg>
        <span
          className="absolute text-xs font-mono font-semibold"
          style={{
            color: isNearMax
              ? "#f87171"
              : isInRange
                ? "#34d399"
                : "var(--text-primary)",
          }}
        >
          {formatTime(seconds)}
        </span>
      </div>
      <div className="text-xs" style={{ color: "var(--text-secondary)" }}>
        {seconds < MIN_DURATION && (
          <span>Need {MIN_DURATION - seconds}s more</span>
        )}
        {isInRange && (
          <span style={{ color: "#34d399" }}>✓ Valid duration</span>
        )}
        {isNearMax && <span style={{ color: "#f87171" }}>Auto-stop soon</span>}
      </div>
    </div>
  );
}

// ─── Main Page Component ──────────────────────────────────────
export default function PronunciationAssessor() {
  // State management
  const [consent, setConsent] = useState(false);
  const [activeTab, setActiveTab] = useState("upload"); // 'upload' | 'record'
  const [audioFile, setAudioFile] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [durationError, setDurationError] = useState(null);
  const [gaugeAnimate, setGaugeAnimate] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  // Refs
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);
  const streamRef = useRef(null);
  const fileInputRef = useRef(null);

  // ─── Cleanup on unmount ───────────────────────────────────
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  // ─── File Upload Handler ──────────────────────────────────
  const handleFileSelect = useCallback(
    (file) => {
      if (!file) return;

      setError(null);
      setDurationError(null);
      setResult(null);

      // Validate audio type
      if (!file.type.startsWith("audio/")) {
        setError("Please select a valid audio file.");
        return;
      }

      // Check duration via Audio element
      const url = URL.createObjectURL(file);
      const audio = new Audio();
      audio.preload = "metadata";

      audio.onloadedmetadata = () => {
        const dur = audio.duration;
        if (audioUrl) URL.revokeObjectURL(audioUrl);

        if (dur < MIN_DURATION || dur > MAX_DURATION) {
          setDurationError(
            `Audio duration is ${dur.toFixed(1)}s. Required: ${MIN_DURATION}–${MAX_DURATION} seconds.`
          );
          URL.revokeObjectURL(url);
          setAudioFile(null);
          setAudioUrl(null);
          return;
        }

        setAudioFile(file);
        setAudioUrl(url);
        setDurationError(null);
      };

      audio.onerror = () => {
        setError("Could not read audio file metadata. Try a different format.");
        URL.revokeObjectURL(url);
      };

      audio.src = url;
    },
    [audioUrl]
  );

  // ─── Drag & Drop ──────────────────────────────────────────
  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files?.[0];
      if (file) handleFileSelect(file);
    },
    [handleFileSelect]
  );

  // ─── Recording Logic ─────────────────────────────────────
  const startRecording = useCallback(async () => {
    try {
      setError(null);
      setDurationError(null);
      setResult(null);
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
        setAudioUrl(null);
      }
      setAudioFile(null);

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        },
      });
      streamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
          ? "audio/webm;codecs=opus"
          : "audio/webm",
      });

      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const file = new File([blob], "recording.webm", {
          type: "audio/webm",
        });
        const url = URL.createObjectURL(blob);
        setAudioFile(file);
        setAudioUrl(url);
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      };

      mediaRecorder.start(250); // Collect data every 250ms
      setIsRecording(true);
      setRecordingSeconds(0);

      let sec = 0;
      timerRef.current = setInterval(() => {
        sec++;
        setRecordingSeconds(sec);

        // Auto-stop at MAX_DURATION
        if (sec >= MAX_DURATION) {
          stopRecording();
        }
      }, 1000);
    } catch (err) {
      console.error("Microphone error:", err);
      setError(
        "Microphone access denied. Please allow microphone permissions in your browser settings."
      );
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

    // Validate duration
    setRecordingSeconds((prev) => {
      if (prev < MIN_DURATION) {
        setDurationError(
          `Recording was ${prev}s. Minimum required: ${MIN_DURATION} seconds.`
        );
        // Clear the invalid recording
        setTimeout(() => {
          setAudioFile(null);
          if (audioUrl) {
            URL.revokeObjectURL(audioUrl);
            setAudioUrl(null);
          }
        }, 100);
      }
      return prev;
    });
  }, [audioUrl]);

  // ─── Submit for Analysis ──────────────────────────────────
  const handleSubmit = useCallback(async () => {
    if (!audioFile || !consent) return;

    setError(null);
    setResult(null);
    setIsAnalyzing(true);
    setGaugeAnimate(false);

    try {
      const formData = new FormData();
      formData.append("audio", audioFile);
      formData.append("consent", "true");

      const response = await fetch("/api/analyze", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.detail || "Analysis failed");
      }

      setResult(data);

      // Trigger gauge animation after a brief delay
      setTimeout(() => setGaugeAnimate(true), 200);
    } catch (err) {
      setError(err.message || "An error occurred during analysis.");
    } finally {
      setIsAnalyzing(false);
    }
  }, [audioFile, consent]);

  // ─── Clear Everything ─────────────────────────────────────
  const handleClear = useCallback(() => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioFile(null);
    setAudioUrl(null);
    setResult(null);
    setError(null);
    setDurationError(null);
    setRecordingSeconds(0);
    setGaugeAnimate(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [audioUrl]);

  // ─── Derived State ───────────────────────────────────────
  const canSubmit = consent && audioFile && !isAnalyzing && !durationError;

  // ─── Render ───────────────────────────────────────────────
  return (
    <main className="relative z-10 flex-1">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* ─── Header ────────────────────────────────────── */}
        <header className="text-center space-y-3 fade-in">
          <div className="flex items-center justify-center gap-3 mb-2">
            <div
              className="p-2.5 rounded-xl"
              style={{
                background: "rgba(99, 102, 241, 0.1)",
                border: "1px solid rgba(99, 102, 241, 0.2)",
              }}
            >
              <Volume2 size={24} style={{ color: "var(--accent-indigo)" }} />
            </div>
            <h1
              className="text-3xl sm:text-4xl font-extrabold tracking-tight"
              style={{
                background:
                  "linear-gradient(135deg, #e2e8f0 0%, #818cf8 50%, #a78bfa 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              VoiceAssess
            </h1>
          </div>
          <p
            className="text-sm max-w-lg mx-auto"
            style={{ color: "var(--text-secondary)" }}
          >
            AI-powered English pronunciation evaluator with word-level accuracy
            scoring.
            <br />
            <span className="inline-flex items-center gap-1 mt-1">
              <Shield size={12} style={{ color: "var(--accent-emerald)" }} />
              <span style={{ color: "var(--accent-emerald)", fontSize: "0.75rem" }}>
                DPDP Act 2023 Compliant
              </span>
            </span>
          </p>
        </header>

        {/* ─── DPDP Consent Card ─────────────────────────── */}
        <section className="glass-card p-6 fade-in fade-in-delay-1">
          <div className="flex items-start gap-4">
            <div
              className="p-2 rounded-lg mt-0.5 flex-shrink-0"
              style={{
                background: consent
                  ? "rgba(52, 211, 153, 0.1)"
                  : "rgba(99, 102, 241, 0.1)",
                border: `1px solid ${consent ? "rgba(52, 211, 153, 0.2)" : "rgba(99, 102, 241, 0.2)"}`,
                transition: "all 0.3s",
              }}
            >
              {consent ? (
                <ShieldCheck
                  size={20}
                  style={{ color: "var(--accent-emerald)" }}
                />
              ) : (
                <Shield
                  size={20}
                  style={{ color: "var(--accent-indigo)" }}
                />
              )}
            </div>
            <label className="flex items-start gap-3 cursor-pointer flex-1">
              <input
                type="checkbox"
                className="consent-checkbox mt-0.5"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                id="dpdp-consent"
              />
              <div>
                <span
                  className="text-sm font-medium block"
                  style={{ color: "var(--text-primary)" }}
                >
                  I explicitly consent to my audio being processed temporarily
                  for pronunciation assessment under DPDP guidelines.
                </span>
                <span
                  className="text-xs mt-1 block"
                  style={{ color: "var(--text-muted)" }}
                >
                  Audio data is never stored permanently. All processing occurs
                  in-memory and data is discarded immediately after analysis.
                  Protected under India&apos;s Digital Personal Data Protection Act
                  2023.
                </span>
              </div>
            </label>
          </div>
        </section>

        {/* ─── Audio Input Section ───────────────────────── */}
        <section className="glass-card p-6 fade-in fade-in-delay-2">
          <div className="flex items-center justify-between mb-5">
            <h2
              className="text-lg font-semibold flex items-center gap-2"
              style={{ color: "var(--text-primary)" }}
            >
              <Activity size={18} style={{ color: "var(--accent-indigo)" }} />
              Audio Input
            </h2>
            <div className="flex gap-2">
              <button
                className={`tab-btn ${activeTab === "upload" ? "active" : ""}`}
                onClick={() => setActiveTab("upload")}
              >
                <Upload size={14} className="inline mr-1.5" />
                Upload
              </button>
              <button
                className={`tab-btn ${activeTab === "record" ? "active" : ""}`}
                onClick={() => setActiveTab("record")}
              >
                <Mic size={14} className="inline mr-1.5" />
                Record
              </button>
            </div>
          </div>

          {/* Tab: Upload */}
          {activeTab === "upload" && (
            <div
              className={`drop-zone ${dragOver ? "drag-over" : ""}`}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*"
                className="hidden"
                onChange={(e) => handleFileSelect(e.target.files?.[0])}
              />
              <FileAudio
                size={40}
                className="mx-auto mb-3"
                style={{ color: "var(--accent-indigo)", opacity: 0.6 }}
              />
              <p
                className="text-sm font-medium"
                style={{ color: "var(--text-secondary)" }}
              >
                Drop your audio file here or{" "}
                <span style={{ color: "var(--accent-indigo)" }}>browse</span>
              </p>
              <p
                className="text-xs mt-1"
                style={{ color: "var(--text-muted)" }}
              >
                Supported: WAV, MP3, M4A, WEBM, OGG • Duration:{" "}
                {MIN_DURATION}–{MAX_DURATION}s • Max 25 MB
              </p>
            </div>
          )}

          {/* Tab: Record */}
          {activeTab === "record" && (
            <div className="flex flex-col items-center gap-5 py-4">
              {/* Waveform Visualization (when recording) */}
              {isRecording && (
                <div className="waveform">
                  {Array.from({ length: 20 }).map((_, i) => (
                    <div
                      key={i}
                      className="waveform-bar"
                      style={{ animationDelay: `${i * 0.06}s` }}
                    />
                  ))}
                </div>
              )}

              {/* Recording Timer */}
              {(isRecording || recordingSeconds > 0) && (
                <RecordingTimer seconds={recordingSeconds} />
              )}

              {/* Record/Stop Button */}
              <button
                onClick={isRecording ? stopRecording : startRecording}
                className={`w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 ${
                  isRecording ? "recording-pulse" : ""
                }`}
                style={{
                  background: isRecording
                    ? "linear-gradient(135deg, #dc2626, #f87171)"
                    : "var(--gradient-primary)",
                  boxShadow: isRecording
                    ? "0 4px 20px rgba(239, 68, 68, 0.4)"
                    : "0 4px 20px rgba(99, 102, 241, 0.3)",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                {isRecording ? (
                  <MicOff size={24} color="white" />
                ) : (
                  <Mic size={24} color="white" />
                )}
              </button>

              <p
                className="text-xs text-center"
                style={{ color: "var(--text-muted)" }}
              >
                {isRecording
                  ? `Recording... (auto-stops at ${MAX_DURATION}s)`
                  : `Click to start recording (${MIN_DURATION}–${MAX_DURATION} seconds)`}
              </p>
            </div>
          )}

          {/* Audio Preview */}
          {audioUrl && !isRecording && (
            <div
              className="mt-4 p-4 rounded-xl flex items-center gap-3"
              style={{
                background: "rgba(99, 102, 241, 0.05)",
                border: "1px solid rgba(99, 102, 241, 0.1)",
              }}
            >
              <FileAudio
                size={18}
                style={{ color: "var(--accent-indigo)", flexShrink: 0 }}
              />
              <audio
                controls
                src={audioUrl}
                className="flex-1 h-10"
                style={{ filter: "invert(1) hue-rotate(180deg)", opacity: 0.8 }}
              />
              <button
                onClick={handleClear}
                className="p-2 rounded-lg transition-colors hover:bg-red-500/10"
                style={{ color: "var(--accent-red)" }}
                title="Remove audio"
              >
                <Trash2 size={16} />
              </button>
            </div>
          )}
        </section>

        {/* ─── Duration Error Banner ─────────────────────── */}
        {durationError && (
          <div className="error-banner">
            <AlertTriangle size={18} className="flex-shrink-0" />
            <div>
              <span className="font-semibold block text-sm">
                Duration Validation Failed
              </span>
              <span className="text-xs" style={{ opacity: 0.8 }}>
                {durationError}
              </span>
            </div>
          </div>
        )}

        {/* ─── General Error Banner ──────────────────────── */}
        {error && (
          <div className="error-banner">
            <XCircle size={18} className="flex-shrink-0" />
            <div>
              <span className="font-semibold block text-sm">Error</span>
              <span className="text-xs" style={{ opacity: 0.8 }}>
                {error}
              </span>
            </div>
          </div>
        )}

        {/* ─── Submit Button ─────────────────────────────── */}
        <div className="flex justify-center">
          <button
            className="btn-primary flex items-center gap-2"
            disabled={!canSubmit}
            onClick={handleSubmit}
          >
            {isAnalyzing ? (
              <>
                <div className="spinner" />
                Analyzing Pronunciation...
              </>
            ) : (
              <>
                <Send size={16} />
                Analyze Pronunciation
              </>
            )}
          </button>
        </div>

        {/* ─── Loading Skeleton ──────────────────────────── */}
        {isAnalyzing && (
          <div className="space-y-4">
            <div className="glass-card-static p-6">
              <div className="shimmer h-48 w-full mb-4" />
              <div className="shimmer h-4 w-3/4 mb-2" />
              <div className="shimmer h-4 w-1/2" />
            </div>
          </div>
        )}

        {/* ─── Results Section ───────────────────────────── */}
        {result && !isAnalyzing && (
          <div className="space-y-6 fade-in">
            {/* ── Overall Score Gauge ─────────────────────── */}
            <section className="glass-card p-8">
              <div className="flex flex-col lg:flex-row items-center gap-8">
                {/* Gauge */}
                <div className="flex-shrink-0">
                  <ScoreGauge
                    score={result.overallScore}
                    animate={gaugeAnimate}
                  />
                </div>

                {/* Stats Panel */}
                <div className="flex-1 w-full">
                  <div className="flex items-center gap-3 mb-4">
                    <BarChart3
                      size={20}
                      style={{ color: "var(--accent-indigo)" }}
                    />
                    <h2
                      className="text-xl font-bold"
                      style={{ color: "var(--text-primary)" }}
                    >
                      Pronunciation Analysis
                    </h2>
                  </div>

                  {/* Fluency Level Badge */}
                  <div className="mb-5">
                    <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
                      Fluency Level:{" "}
                    </span>
                    <span
                      className="text-lg font-bold"
                      style={{
                        color: getFluencyLevel(result.overallScore).color,
                      }}
                    >
                      {getFluencyLevel(result.overallScore).tier} —{" "}
                      {getFluencyLevel(result.overallScore).label}
                    </span>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div
                      className="p-3 rounded-xl text-center"
                      style={{
                        background: "rgba(99, 102, 241, 0.06)",
                        border: "1px solid rgba(99, 102, 241, 0.12)",
                      }}
                    >
                      <div
                        className="text-2xl font-bold"
                        style={{ color: "var(--accent-indigo)" }}
                      >
                        {result.metadata?.wordCount || result.words.length}
                      </div>
                      <div
                        className="text-xs"
                        style={{ color: "var(--text-muted)" }}
                      >
                        Total Words
                      </div>
                    </div>
                    <div
                      className="p-3 rounded-xl text-center"
                      style={{
                        background: "rgba(52, 211, 153, 0.06)",
                        border: "1px solid rgba(52, 211, 153, 0.12)",
                      }}
                    >
                      <div
                        className="text-2xl font-bold"
                        style={{ color: "var(--accent-emerald)" }}
                      >
                        {result.metadata?.clearWords ??
                          result.words.filter((w) => w.errorType === "None")
                            .length}
                      </div>
                      <div
                        className="text-xs"
                        style={{ color: "var(--text-muted)" }}
                      >
                        Clear
                      </div>
                    </div>
                    <div
                      className="p-3 rounded-xl text-center"
                      style={{
                        background: "rgba(251, 191, 36, 0.06)",
                        border: "1px solid rgba(251, 191, 36, 0.12)",
                      }}
                    >
                      <div
                        className="text-2xl font-bold"
                        style={{ color: "var(--accent-amber)" }}
                      >
                        {result.metadata?.unclearWords ??
                          result.words.filter((w) => w.errorType === "Unclear")
                            .length}
                      </div>
                      <div
                        className="text-xs"
                        style={{ color: "var(--text-muted)" }}
                      >
                        Unclear
                      </div>
                    </div>
                    <div
                      className="p-3 rounded-xl text-center"
                      style={{
                        background: "rgba(248, 113, 113, 0.06)",
                        border: "1px solid rgba(248, 113, 113, 0.12)",
                      }}
                    >
                      <div
                        className="text-2xl font-bold"
                        style={{ color: "var(--accent-red)" }}
                      >
                        {result.metadata?.mispronunciations ??
                          result.words.filter(
                            (w) => w.errorType === "Mispronunciation"
                          ).length}
                      </div>
                      <div
                        className="text-xs"
                        style={{ color: "var(--text-muted)" }}
                      >
                        Errors
                      </div>
                    </div>
                  </div>

                  {/* Duration */}
                  {result.metadata?.duration && (
                    <div
                      className="mt-4 flex items-center gap-2 text-xs"
                      style={{ color: "var(--text-muted)" }}
                    >
                      <Clock size={12} />
                      <span>
                        Duration: {result.metadata.duration.toFixed(1)}s
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* ── Interactive Transcript ──────────────────── */}
            <section className="glass-card p-6 fade-in fade-in-delay-1">
              <h3
                className="text-md font-semibold mb-4 flex items-center gap-2"
                style={{ color: "var(--text-primary)" }}
              >
                <FileAudio
                  size={16}
                  style={{ color: "var(--accent-indigo)" }}
                />
                Interactive Transcript
              </h3>

              {/* Legend */}
              <div
                className="flex flex-wrap gap-4 mb-4 pb-4"
                style={{ borderBottom: "1px solid var(--border-subtle)" }}
              >
                <div className="flex items-center gap-1.5">
                  <span
                    className="w-3 h-3 rounded-sm"
                    style={{ background: "var(--accent-emerald)" }}
                  />
                  <span
                    className="text-xs"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    Clear
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span
                    className="w-3 h-3 rounded-sm"
                    style={{ background: "var(--accent-amber)" }}
                  />
                  <span
                    className="text-xs"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    Unclear
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span
                    className="w-3 h-3 rounded-sm"
                    style={{ background: "var(--accent-red)" }}
                  />
                  <span
                    className="text-xs"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    Mispronunciation
                  </span>
                </div>
              </div>

              {/* Token Cloud */}
              <div
                className="p-4 rounded-xl leading-relaxed"
                style={{
                  background: "rgba(2, 6, 15, 0.5)",
                  border: "1px solid var(--border-subtle)",
                }}
              >
                {result.words.map((w, i) => (
                  <TokenSpan
                    key={`${w.word}-${i}`}
                    word={w.word}
                    accuracyScore={w.accuracyScore}
                    errorType={w.errorType}
                    start={w.start}
                    end={w.end}
                  />
                ))}
              </div>
            </section>

            {/* ── DPDP Compliance Footer ─────────────────── */}
            <div
              className="text-center text-xs py-4 flex items-center justify-center gap-2"
              style={{ color: "var(--text-muted)" }}
            >
              <ShieldCheck size={14} style={{ color: "var(--accent-emerald)" }} />
              <span>
                All audio data was processed in-memory and has been permanently
                discarded. No recordings are stored. Compliant with DPDP Act
                2023.
              </span>
            </div>
          </div>
        )}

        {/* ─── Footer ────────────────────────────────────── */}
        {!result && (
          <footer
            className="text-center text-xs py-8"
            style={{ color: "var(--text-muted)" }}
          >
            <div className="flex items-center justify-center gap-2 mb-2">
              <Shield size={14} style={{ color: "var(--accent-indigo)" }} />
              <span className="font-medium">
                Privacy-First Architecture
              </span>
            </div>
            <p>
              Zero data retention • In-memory processing only • DPDP Act 2023
              compliant
            </p>
          </footer>
        )}
      </div>
    </main>
  );
}
