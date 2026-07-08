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
  Sparkles,
  Languages,
} from "lucide-react";

// ─── Constants ────────────────────────────────────────────────
const MIN_DURATION = 30;
const MAX_DURATION = 45;

// ─── Fluency Level Mapper ─────────────────────────────────────
function getFluencyLevel(score) {
  if (score >= 90) return { label: "Excellent Diction", color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20", tier: "Native (A+)" };
  if (score >= 80) return { label: "Highly Proficient", color: "text-teal-400", bg: "bg-teal-500/10", border: "border-teal-500/20", tier: "Professional (A)" };
  if (score >= 70) return { label: "Good Diction", color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20", tier: "Conversational (B+)" };
  if (score >= 60) return { label: "Intermediate", color: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/20", tier: "Functional (B)" };
  if (score >= 50) return { label: "Needs Polish", color: "text-rose-400", bg: "bg-rose-500/10", border: "border-rose-500/20", tier: "Developing (C)" };
  return { label: "Pronunciation Assistance Required", color: "text-red-500", bg: "bg-red-500/10", border: "border-red-500/20", tier: "Basic (D)" };
}

// ─── Score Radial Progress Gauge ──────────────────────────────
function ScoreRadialGauge({ score, animate }) {
  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const fluency = getFluencyLevel(score);

  const getStrokeGradientId = () => {
    if (score >= 80) return "gaugeGradGreen";
    if (score >= 60) return "gaugeGradAmber";
    return "gaugeGradRed";
  };

  return (
    <div className="relative w-48 h-48 flex items-center justify-center">
      {/* Background glow behind gauge */}
      <div className="absolute inset-4 rounded-full bg-indigo-500/5 blur-xl pointer-events-none" />
      
      <svg
        className="transform -rotate-90 filter drop-shadow-[0_0_15px_rgba(99,102,241,0.25)]"
        width="180"
        height="180"
        viewBox="0 0 200 200"
      >
        <defs>
          <linearGradient id="gaugeGradGreen" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#34d399" />
          </linearGradient>
          <linearGradient id="gaugeGradAmber" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#fbbf24" />
          </linearGradient>
          <linearGradient id="gaugeGradRed" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ef4444" />
            <stop offset="100%" stopColor="#f87171" />
          </linearGradient>
        </defs>
        
        {/* Track circle */}
        <circle
          cx="100"
          cy="100"
          r={radius}
          fill="none"
          stroke="rgba(255, 255, 255, 0.03)"
          strokeWidth="12"
        />
        
        {/* Progress circle */}
        <circle
          cx="100"
          cy="100"
          r={radius}
          fill="none"
          stroke={`url(#${getStrokeGradientId()})`}
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={animate ? offset : circumference}
          style={{ transition: "stroke-dashoffset 1.6s cubic-bezier(0.16, 1, 0.3, 1)" }}
        />
      </svg>
      
      {/* Centered Score details */}
      <div className="absolute flex flex-col items-center justify-center text-center">
        <span className={`text-5xl font-black tracking-tighter transition-all duration-700 ${fluency.color}`}>
          {animate ? Math.round(score) : 0}
        </span>
        <span className="text-[10px] uppercase tracking-widest text-slate-400 font-medium mt-1">
          Accuracy
        </span>
      </div>
    </div>
  );
}

// ─── Word Span Component (Transcripts) ────────────────────────
function TokenSpan({ word, accuracyScore, errorType, start, end }) {
  const colorMap = {
    Mispronunciation: "text-rose-400 underline decoration-rose-500/60 decoration-2 underline-offset-4 bg-rose-500/5 border-rose-500/10 hover:bg-rose-500/10",
    Unclear: "text-amber-400 decoration-amber-500/60 decoration-2 underline-offset-4 bg-amber-500/5 border-amber-500/10 hover:bg-amber-500/10",
    None: "text-emerald-400/90 bg-emerald-500/5 border-emerald-500/10 hover:bg-emerald-500/10",
  };

  const badgeColor = {
    Mispronunciation: "bg-rose-500/20 text-rose-300",
    Unclear: "bg-amber-500/20 text-amber-300",
    None: "bg-emerald-500/20 text-emerald-300",
  };

  return (
    <span className="group relative inline-flex items-center mx-1 my-1">
      <span className={`px-2 py-0.5 rounded border text-[15px] font-mono transition-all duration-200 cursor-pointer hover:-translate-y-0.5 hover:scale-105 active:translate-y-0 ${colorMap[errorType] || colorMap.None}`}>
        {word}
      </span>
      
      {/* Micro-Tooltip Portal */}
      <span className="absolute bottom-[calc(100%+8px)] left-1/2 -translate-x-1/2 scale-95 opacity-0 pointer-events-none transition-all duration-200 group-hover:scale-100 group-hover:opacity-100 z-30 w-44 bg-slate-900/95 border border-white/10 backdrop-blur-md rounded-xl p-3 shadow-2xl">
        <div className="flex justify-between items-center mb-1.5">
          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${badgeColor[errorType]}`}>
            {errorType === "None" ? "Good" : errorType}
          </span>
          <span className="text-[10px] text-slate-400 font-mono">
            {start.toFixed(1)}s – {end.toFixed(1)}s
          </span>
        </div>
        <div className="flex items-baseline gap-1 text-slate-200 text-xs font-medium">
          <span>Confidence:</span>
          <span className="font-bold text-white font-mono text-sm">{accuracyScore}%</span>
        </div>
        
        {/* Pointer Arrow */}
        <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900" />
      </span>
    </span>
  );
}

// ─── Recording Limit Meter ────────────────────────────────────
function RecordingProgressIndicator({ seconds }) {
  const percentage = Math.min((seconds / MAX_DURATION) * 100, 100);
  const isValid = seconds >= MIN_DURATION && seconds <= MAX_DURATION;
  
  return (
    <div className="w-full max-w-sm space-y-2.5">
      <div className="flex justify-between items-center text-xs">
        <span className="text-slate-400 flex items-center gap-1.5">
          <Clock size={13} className="text-indigo-400" />
          <span>Recording: <strong className="font-mono text-white text-[13px]">{seconds}s</strong></span>
        </span>
        <span className={isValid ? "text-emerald-400 font-medium" : "text-amber-400"}>
          {isValid ? "✓ Target Duration Met" : `Need ${MIN_DURATION - seconds}s more`}
        </span>
      </div>
      
      {/* Premium custom progress bar */}
      <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/[0.03]">
        <div
          className={`h-full transition-all duration-300 rounded-full ${
            seconds >= MAX_DURATION - 5
              ? "bg-rose-500 animate-pulse"
              : isValid
                ? "bg-gradient-to-r from-teal-500 to-emerald-400"
                : "bg-gradient-to-r from-indigo-500 to-purple-500"
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

// ─── Main Controller ──────────────────────────────────────────
export default function PronunciationAssessor() {
  const [consent, setConsent] = useState(false);
  const [activeTab, setActiveTab] = useState("upload");
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

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);
  const streamRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  const handleFileSelect = useCallback(
    (file) => {
      if (!file) return;

      setError(null);
      setDurationError(null);
      setResult(null);

      if (!file.type.startsWith("audio/")) {
        setError("Please choose a valid audio file.");
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
            `Selected file length (${duration.toFixed(1)}s) is outside the mandatory ${MIN_DURATION} to ${MAX_DURATION} seconds window.`
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
        setError("Failed to decode audio file. Please try a different encoding format.");
        URL.revokeObjectURL(url);
      };

      audio.src = url;
    },
    [audioUrl]
  );

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files?.[0];
      if (file) handleFileSelect(file);
    },
    [handleFileSelect]
  );

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
          channelCount: 1,
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
      setError("Unable to capture microphone. Please check system permissions.");
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
      if (prev < MIN_DURATION) {
        setDurationError(
          `Recording duration is too short (${prev}s). Please speak for at least 30 seconds.`
        );
        setTimeout(() => {
          setAudioFile(null);
          if (audioUrl) {
            URL.revokeObjectURL(audioUrl);
            setAudioUrl(null);
          }
        }, 120);
      }
      return prev;
    });
  }, [audioUrl]);

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
        throw new Error(data.error || data.detail || "Transcription query failed.");
      }

      setResult(data);
      setTimeout(() => setGaugeAnimate(true), 250);
    } catch (err) {
      setError(err.message || "An unexpected error occurred during transcription processing.");
    } finally {
      setIsAnalyzing(false);
    }
  }, [audioFile, consent]);

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

  const canSubmit = consent && audioFile && !isAnalyzing && !durationError;

  return (
    <main className="relative min-h-screen bg-[#030712] text-slate-100 flex flex-col justify-between overflow-hidden">
      
      {/* ─── Ambient Glow Elements (Linear/Vercel Aesthetic) ────── */}
      <div className="absolute top-[-15%] left-[-10%] w-[60vw] h-[60vw] max-w-[800px] rounded-full bg-indigo-500/10 blur-[130px] pointer-events-none select-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] max-w-[700px] rounded-full bg-emerald-500/5 blur-[120px] pointer-events-none select-none" />
      <div className="absolute top-[30%] right-[15%] w-[35vw] h-[35vw] max-w-[500px] rounded-full bg-purple-500/5 blur-[140px] pointer-events-none select-none" />

      {/* Grid Pattern overlay for tech aesthetic */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />

      <div className="relative z-10 flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 py-12 space-y-10">
        
        {/* ─── Header ────────────────────────────────────── */}
        <header className="text-center space-y-4 animate-fade-in">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.03] border border-white/[0.08] backdrop-blur-md mb-2">
            <Sparkles size={13} className="text-indigo-400" />
            <span className="text-[11px] font-semibold text-slate-300 uppercase tracking-widest">
              Linguistic AI Assessment
            </span>
          </div>
          
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight bg-gradient-to-b from-white via-slate-200 to-slate-500 bg-clip-text text-transparent">
            VoiceAssess Pronunciation
          </h1>
          
          <p className="text-slate-400 text-sm sm:text-base max-w-xl mx-auto font-medium">
            English pronunciation grader with word-level accurate confidence mapping. Powered by Whisper models.
          </p>
        </header>

        {/* ─── DPDP Consent Card ─────────────────────────── */}
        <section className="bg-slate-900/30 backdrop-blur-xl border border-white/[0.06] rounded-2xl p-5 sm:p-6 shadow-2xl transition-all duration-300 hover:border-white/[0.1]">
          <div className="flex items-start gap-4">
            <div
              className={`p-2.5 rounded-xl transition-all duration-300 ${
                consent
                  ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
                  : "bg-indigo-500/10 border border-indigo-500/20 text-indigo-400"
              }`}
            >
              {consent ? <ShieldCheck size={20} /> : <Shield size={20} />}
            </div>
            
            <label className="flex items-start gap-3.5 cursor-pointer flex-1 select-none">
              <input
                type="checkbox"
                className="consent-checkbox mt-1"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                id="dpdp-consent"
              />
              <div className="space-y-1">
                <span className="text-slate-200 text-sm font-semibold block leading-snug">
                  I explicitly consent to my audio being processed temporarily for pronunciation assessment under DPDP guidelines.
                </span>
                <p className="text-[12px] text-slate-400 leading-relaxed">
                  Audio data is strictly processed in-memory and immediately garbage-collected. No persistent storage or disk logging. Protected under India&apos;s Digital Personal Data Protection Act 2023.
                </p>
              </div>
            </label>
          </div>
        </section>

        {/* ─── Input workspace ───────────────────────────── */}
        <section className="bg-slate-900/30 backdrop-blur-xl border border-white/[0.06] rounded-2xl p-6 shadow-2xl space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-3.5 bg-indigo-500 rounded-full" />
              <h2 className="text-sm font-semibold tracking-wider uppercase text-slate-300">
                Audio Submission
              </h2>
            </div>
            
            {/* Tabs */}
            <div className="flex p-1 rounded-lg bg-white/[0.03] border border-white/[0.05]">
              <button
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                  activeTab === "upload"
                    ? "bg-indigo-500/15 text-indigo-300 border border-indigo-500/20 shadow-sm"
                    : "text-slate-400 hover:text-slate-200 border border-transparent"
                }`}
                onClick={() => {
                  if (!isRecording) setActiveTab("upload");
                }}
                disabled={isRecording}
              >
                <Upload size={13} />
                Upload
              </button>
              <button
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                  activeTab === "record"
                    ? "bg-indigo-500/15 text-indigo-300 border border-indigo-500/20 shadow-sm"
                    : "text-slate-400 hover:text-slate-200 border border-transparent"
                }`}
                onClick={() => setActiveTab("record")}
              >
                <Mic size={13} />
                Record
              </button>
            </div>
          </div>

          {/* Tab: Upload */}
          {activeTab === "upload" && (
            <div
              className={`border border-dashed rounded-xl p-8 text-center transition-all cursor-pointer ${
                dragOver
                  ? "border-indigo-400 bg-indigo-500/5 shadow-[inset_0_0_20px_rgba(99,102,241,0.06)]"
                  : "border-white/[0.08] hover:border-white/20 bg-white/[0.01]"
              }`}
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
              <FileAudio size={36} className="mx-auto text-indigo-400/80 mb-3" />
              <p className="text-sm text-slate-300 font-medium">
                Drag speech audio sample here, or{" "}
                <span className="text-indigo-400 underline underline-offset-2">browse files</span>
              </p>
              <p className="text-[11px] text-slate-500 mt-2">
                WAV, MP3, M4A, WEBM • Length limit: {MIN_DURATION}s to {MAX_DURATION}s • Max size 25MB
              </p>
            </div>
          )}

          {/* Tab: Record */}
          {activeTab === "record" && (
            <div className="flex flex-col items-center gap-6 py-6 border border-white/[0.03] rounded-xl bg-white/[0.01]">
              
              {/* Animated waveform visualizer */}
              {isRecording ? (
                <div className="flex items-center gap-1 h-8 animate-pulse">
                  {Array.from({ length: 18 }).map((_, i) => (
                    <div
                      key={i}
                      className="w-1 rounded-full bg-indigo-400/80"
                      style={{
                        height: `${Math.sin(i * 0.4) * 20 + 24}px`,
                        animation: "wave 1.2s ease-in-out infinite",
                        animationDelay: `${i * 0.05}s`,
                      }}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-slate-500 text-xs flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-600 animate-ping" />
                  Ready to capture audio stream
                </div>
              )}

              {/* Progress/Timer Display */}
              {(isRecording || recordingSeconds > 0) && (
                <RecordingProgressIndicator seconds={recordingSeconds} />
              )}

              {/* Core Record trigger */}
              <div className="relative">
                {isRecording && (
                  <span className="absolute -inset-2.5 rounded-full bg-rose-500/10 border border-rose-500/30 animate-ping pointer-events-none" />
                )}
                <button
                  onClick={isRecording ? stopRecording : startRecording}
                  className={`w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg ${
                    isRecording
                      ? "bg-gradient-to-r from-red-600 to-rose-500 hover:scale-95 text-white"
                      : "bg-gradient-to-r from-indigo-600 to-purple-500 hover:scale-105 hover:shadow-indigo-500/20 text-white"
                  }`}
                >
                  {isRecording ? <MicOff size={24} /> : <Mic size={24} />}
                </button>
              </div>

              <p className="text-[11px] text-slate-500">
                {isRecording
                  ? `Active mic session — Auto-stopping at ${MAX_DURATION}s`
                  : `Please record between ${MIN_DURATION} and ${MAX_DURATION} seconds`}
              </p>
            </div>
          )}

          {/* Local Audio Player Previews */}
          {audioUrl && !isRecording && (
            <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.05] flex items-center justify-between gap-4">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 flex-shrink-0">
                  <FileAudio size={16} />
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-semibold text-slate-300 block truncate">
                    {audioFile?.name || "recording.webm"}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    {(audioFile ? audioFile.size / 1024 / 1024 : 0).toFixed(2)} MB
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <audio
                  controls
                  src={audioUrl}
                  className="h-8 max-w-[200px] sm:max-w-[240px] opacity-80 filter invert"
                />
                <button
                  onClick={handleClear}
                  className="p-2 rounded-lg hover:bg-rose-500/10 text-rose-400 transition-colors"
                  title="Discard file"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          )}
        </section>

        {/* ─── Validation Error Alerts ────────────────────── */}
        {durationError && (
          <div className="flex items-start gap-3 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 animate-slide-in">
            <AlertTriangle size={18} className="mt-0.5 flex-shrink-0" />
            <div className="space-y-0.5">
              <span className="text-xs font-bold uppercase tracking-wider block">
                Duration Validation Error
              </span>
              <p className="text-xs text-rose-300/80 leading-relaxed">
                {durationError}
              </p>
            </div>
          </div>
        )}

        {/* ─── Generic Handler Errors ──────────────────────── */}
        {error && (
          <div className="flex items-start gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 animate-slide-in">
            <XCircle size={18} className="mt-0.5 flex-shrink-0" />
            <div className="space-y-0.5">
              <span className="text-xs font-bold uppercase tracking-wider block">
                Analysis Request Failure
              </span>
              <p className="text-xs text-red-300/80 leading-relaxed">
                {error}
              </p>
            </div>
          </div>
        )}

        {/* ─── Submit action trigger ─────────────────────── */}
        <div className="flex justify-center">
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className={`px-8 py-3.5 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center gap-2.5 transition-all ${
              canSubmit
                ? "bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-600 text-white shadow-xl shadow-indigo-500/10 hover:shadow-indigo-500/20 hover:-translate-y-0.5 cursor-pointer"
                : "bg-white/[0.02] text-slate-500 border border-white/[0.04] cursor-not-allowed"
            }`}
          >
            {isAnalyzing ? (
              <>
                <Loader2 size={14} className="animate-spin text-indigo-400" />
                <span>Evaluating acoustics...</span>
              </>
            ) : (
              <>
                <Send size={13} />
                <span>Analyze pronunciation</span>
              </>
            )}
          </button>
        </div>

        {/* ─── Analysis Loader Skeleton ─────────────────── */}
        {isAnalyzing && (
          <div className="space-y-4 animate-pulse">
            <div className="bg-slate-900/30 border border-white/[0.05] rounded-2xl p-6 space-y-4">
              <div className="h-6 w-1/4 bg-white/5 rounded-full" />
              <div className="space-y-2">
                <div className="h-4 w-full bg-white/5 rounded" />
                <div className="h-4 w-5/6 bg-white/5 rounded" />
                <div className="h-4 w-3/4 bg-white/5 rounded" />
              </div>
            </div>
          </div>
        )}

        {/* ─── Dashboard Results View ─────────────────────── */}
        {result && !isAnalyzing && (
          <div className="space-y-6 animate-fade-in">
            
            {/* ── Premium Metric Banner ── */}
            <section className="bg-slate-900/30 backdrop-blur-xl border border-white/[0.06] rounded-2xl overflow-hidden shadow-2xl">
              <div className="p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-8">
                
                {/* Radial gauge display */}
                <div className="flex-shrink-0">
                  <ScoreRadialGauge
                    score={result.overallScore}
                    animate={gaugeAnimate}
                  />
                </div>

                {/* Performance matrices */}
                <div className="flex-1 w-full space-y-6">
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 block mb-1">
                      Grading Category
                    </span>
                    <div className="flex items-center gap-2">
                      <Languages size={18} className="text-indigo-400" />
                      <h3 className="text-xl sm:text-2xl font-black bg-gradient-to-r from-white via-slate-200 to-indigo-300 bg-clip-text text-transparent">
                        {getFluencyLevel(result.overallScore).tier}
                      </h3>
                    </div>
                    <p className={`text-sm font-semibold mt-1 ${getFluencyLevel(result.overallScore).color}`}>
                      {getFluencyLevel(result.overallScore).label}
                    </p>
                  </div>

                  {/* Quantitative breakdowns */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-white/[0.02] border border-white/[0.04] p-3 rounded-xl text-center">
                      <span className="text-xl font-bold font-mono text-white block">
                        {result.metadata?.wordCount || result.words.length}
                      </span>
                      <span className="text-[10px] text-slate-400 tracking-wider">
                        Total Words
                      </span>
                    </div>

                    <div className="bg-white/[0.02] border border-white/[0.04] p-3 rounded-xl text-center">
                      <span className="text-xl font-bold font-mono text-emerald-400 block">
                        {result.metadata?.clearWords ??
                          result.words.filter((w) => w.errorType === "None").length}
                      </span>
                      <span className="text-[10px] text-slate-400 tracking-wider">
                        Excellent
                      </span>
                    </div>

                    <div className="bg-white/[0.02] border border-white/[0.04] p-3 rounded-xl text-center">
                      <span className="text-xl font-bold font-mono text-amber-400 block">
                        {result.metadata?.unclearWords ??
                          result.words.filter((w) => w.errorType === "Unclear").length}
                      </span>
                      <span className="text-[10px] text-slate-400 tracking-wider">
                        Unclear
                      </span>
                    </div>

                    <div className="bg-white/[0.02] border border-white/[0.04] p-3 rounded-xl text-center">
                      <span className="text-xl font-bold font-mono text-rose-400 block">
                        {result.metadata?.mispronunciations ??
                          result.words.filter((w) => w.errorType === "Mispronunciation").length}
                      </span>
                      <span className="text-[10px] text-slate-400 tracking-wider">
                        Errors
                      </span>
                    </div>
                  </div>

                  {/* Subtitle timing info */}
                  {result.metadata?.duration && (
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
                      <Clock size={11} />
                      <span>Duration processed: {result.metadata.duration.toFixed(1)}s</span>
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* ── Interactive Transcript Visualizer ── */}
            <section className="bg-slate-900/30 backdrop-blur-xl border border-white/[0.06] rounded-2xl p-5 sm:p-6 shadow-2xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/[0.04]">
                <div className="flex items-center gap-2">
                  <Activity size={15} className="text-indigo-400" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                    Phonetic Transcript mapping
                  </h3>
                </div>

                {/* Legend indicator */}
                <div className="flex items-center gap-3.5 text-[10px] text-slate-400">
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Clear
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Unclear
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500" /> Error
                  </span>
                </div>
              </div>

              {/* Text area word layout container */}
              <div className="p-5 rounded-xl bg-slate-950/40 border border-white/[0.03] leading-relaxed select-text">
                {result.words.map((w, index) => (
                  <TokenSpan
                    key={`${w.word}-${index}`}
                    word={w.word}
                    accuracyScore={w.accuracyScore}
                    errorType={w.errorType}
                    start={w.start}
                    end={w.end}
                  />
                ))}
              </div>
            </section>

            {/* DPDP processing status disclaimer */}
            <div className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-white/[0.01] border border-white/[0.03]">
              <ShieldCheck size={14} className="text-emerald-400" />
              <span className="text-[10px] sm:text-xs text-slate-500 font-medium text-center">
                DPDP Act 2023 Compliant. Processing occurred in-memory. Audio stream discarded completely.
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ─── Sticky footer metadata ──────────────────────── */}
      {!result && (
        <footer className="relative z-10 w-full border-t border-white/[0.04] bg-[#030712]/80 backdrop-blur-md py-6 text-center text-[11px] text-slate-500 font-medium">
          <div className="max-w-4xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <span className="flex items-center gap-1.5">
              <Shield size={12} className="text-indigo-400" />
              <span>DPDP 2023 Compliant Security Protocol Active</span>
            </span>
            <span>Zero Persistent Server Storage Buffer Architecture</span>
          </div>
        </footer>
      )}
    </main>
  );
}
