"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { PodcastScriptContent } from "@/lib/ai/types";

const ease = [0.25, 0.46, 0.45, 0.94] as const;

/** Strip Grok TTS speech tags for display: inline [laugh] and wrapping <emphasis>...</emphasis> */
function stripSpeechTags(text: string): string {
  return text
    .replace(/\[(?:pause|long-pause|hum-tune|laugh|chuckle|giggle|cry|tsk|tongue-click|lip-smack|breath|inhale|exhale|sigh)\]/gi, "")
    .replace(/<\/?\s*(?:soft|whisper|loud|build-intensity|decrease-intensity|higher-pitch|lower-pitch|slow|fast|sing-song|singing|laugh-speak|emphasis)\s*>/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

interface PodcastScriptRendererProps {
  content: PodcastScriptContent;
  mediaUrl?: string | null;
}

export function PodcastScriptRenderer({
  content,
  mediaUrl,
}: PodcastScriptRendererProps) {
  const segments = content.segments ?? [];
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
    } else {
      setIsLoading(true);
      audio.play().finally(() => setIsLoading(false));
    }
  }, [isPlaying]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onLoadedMetadata = () => setDuration(audio.duration);
    const onEnded = () => { setIsPlaying(false); setCurrentTime(0); };

    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("ended", onEnded);

    return () => {
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("ended", onEnded);
    };
  }, [mediaUrl]);

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    audio.currentTime = ratio * duration;
  };

  // No audio yet — show placeholder, NO transcript
  if (!mediaUrl) {
    return (
      <div className="mx-auto max-w-3xl">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, ease }}
          className="rounded-2xl border border-gray-900/10 bg-white/50 px-8 py-12 text-center backdrop-blur-xl dark:border-white/15 dark:bg-white/10"
        >
          <div className="mb-3 flex items-center justify-center">
            <span className="inline-flex items-center justify-center rounded-full bg-[#5227FF]/10 px-4 py-1.5 text-xs font-semibold text-[#5227FF] dark:text-[#8B6FFF]">
              Podcast
            </span>
          </div>
          <p className="text-sm text-gray-900/50 dark:text-white/50">
            Podcast Audio Generating...
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      {/* Audio player */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, ease }}
        className="rounded-2xl border border-[#5227FF]/20 bg-[#5227FF]/5 p-5 backdrop-blur-xl dark:border-[#5227FF]/30 dark:bg-[#5227FF]/10"
      >
        <audio ref={audioRef} src={mediaUrl} preload="metadata" />

        <div className="flex flex-col items-center gap-3">
          {/* Play/pause button */}
          <button
            onClick={togglePlay}
            disabled={isLoading}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-[#5227FF] text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            {isLoading ? (
              <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : isPlaying ? (
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="4" width="4" height="16" rx="1" />
                <rect x="14" y="4" width="4" height="16" rx="1" />
              </svg>
            ) : (
              <svg className="ml-0.5 h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>

          {/* Progress bar */}
          <div className="w-full">
            <div
              className="group relative h-2 w-full cursor-pointer rounded-full bg-gray-900/10 dark:bg-white/10"
              onClick={handleSeek}
            >
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-[#5227FF] transition-all"
                style={{ width: duration ? `${(currentTime / duration) * 100}%` : "0%" }}
              />
            </div>
            <div className="mt-1.5 flex items-center justify-between text-[11px] tabular-nums text-gray-900/50 dark:text-white/50">
              <span>{formatTime(currentTime)}</span>
              <span>{duration ? formatTime(duration) : "--:--"}</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Transcript toggle */}
      <div className="flex items-center justify-center">
        <button
          onClick={() => setShowTranscript(!showTranscript)}
          className="rounded-full bg-gray-900/5 px-4 py-1.5 text-xs font-medium text-gray-900/50 transition-colors hover:bg-gray-900/10 dark:bg-white/5 dark:text-white/50 dark:hover:bg-white/10"
        >
          {showTranscript ? "Hide Transcript" : "Show Transcript"}
        </button>
      </div>

      {/* Full transcript — collapsed by default */}
      <AnimatePresence>
        {showTranscript && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.4, ease }}
            className="overflow-hidden"
          >
            <div className="space-y-3">
              {segments.map((segment, idx) => (
                <div
                  key={idx}
                  className="rounded-2xl border border-gray-900/10 bg-white/50 p-5 backdrop-blur-xl dark:border-white/15 dark:bg-white/10"
                >
                  <div className="mb-3 flex flex-wrap items-center justify-center gap-2">
                    <span className="inline-flex items-center justify-center rounded-full bg-[#5227FF]/10 px-3 py-1 text-[11px] font-semibold text-[#5227FF] dark:text-[#8B6FFF]">
                      {segment.speaker}
                    </span>
                  </div>
                  <p className="text-center text-sm leading-relaxed text-gray-900/70 dark:text-white/70">
                    {stripSpeechTags(segment.text)}
                  </p>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
