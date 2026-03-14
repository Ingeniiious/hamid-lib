"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import type { PodcastScriptContent } from "@/lib/ai/types";

const ease = [0.25, 0.46, 0.45, 0.94] as const;

/** Strip ElevenLabs v3 audio tags like [laughs], [excited], etc. for display */
function stripAudioTags(text: string): string {
  return text.replace(/\[(?:laughs?|sighs?|gasps?|clears throat|whispers?|excited|sad|angry|surprised|curious|sarcastic|warmly|thoughtfully|enthusiastically|gently|firmly|playfully|seriously|nervously|confidently|hesitantly|dramatically|softly|loudly|quickly|slowly|pause|long pause|music|applause|sound effect)\]/gi, "").replace(/\s{2,}/g, " ").trim();
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

  if (segments.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-900/10 bg-white/50 px-12 py-16 text-center backdrop-blur-xl dark:border-white/15 dark:bg-white/10">
        <p className="text-sm text-gray-900/50 dark:text-white/50">
          No Podcast Script Available
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      {/* Audio player */}
      {mediaUrl && (
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
                <span>{duration ? formatTime(duration) : content.totalDuration ?? "--:--"}</span>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Total duration badge (only when no audio) */}
      {!mediaUrl && content.totalDuration && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, ease }}
          className="flex items-center justify-center"
        >
          <span className="inline-flex items-center justify-center rounded-full bg-[#5227FF]/10 px-4 py-1.5 text-xs font-semibold text-[#5227FF] dark:text-[#8B6FFF]">
            Total Duration: {content.totalDuration}
          </span>
        </motion.div>
      )}

      {/* Segments timeline */}
      <div className="space-y-3">
        {segments.map((segment, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, ease, delay: idx * 0.05 }}
            className="rounded-2xl border border-gray-900/10 bg-white/50 p-5 backdrop-blur-xl dark:border-white/15 dark:bg-white/10"
          >
            {/* Timestamp + speaker */}
            <div className="mb-3 flex flex-wrap items-center justify-center gap-2">
              <span className="inline-flex items-center justify-center rounded-full bg-gray-900/5 px-3 py-1 text-[11px] font-medium tabular-nums text-gray-900/60 dark:bg-white/5 dark:text-white/60">
                {segment.timestamp}
              </span>
              <span className="inline-flex items-center justify-center rounded-full bg-[#5227FF]/10 px-3 py-1 text-[11px] font-semibold text-[#5227FF] dark:text-[#8B6FFF]">
                {segment.speaker}
              </span>
            </div>

            {/* Segment text — audio tags stripped for clean display */}
            <p className="text-center text-sm leading-relaxed text-gray-900/70 dark:text-white/70">
              {stripAudioTags(segment.text)}
            </p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
