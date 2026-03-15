"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Play, Pause, CircleNotch } from "@phosphor-icons/react";
import type { PodcastScriptContent } from "@/lib/ai/types";

const ease = [0.25, 0.46, 0.45, 0.94] as const;
const accent = "#5227FF";
const BAR_COUNT = 80;
const BAR_W = 3;
const BAR_GAP = 5; // total slot width = BAR_W + BAR_GAP
const SLOT_W = BAR_W + BAR_GAP;

/** Strip Grok TTS speech tags for display */
function stripSpeechTags(text: string): string {
  return text
    .replace(
      /\[(?:pause|long-pause|hum-tune|laugh|chuckle|giggle|cry|tsk|tongue-click|lip-smack|breath|inhale|exhale|sigh)\]/gi,
      ""
    )
    .replace(
      /<\/?\s*(?:soft|whisper|loud|build-intensity|decrease-intensity|higher-pitch|lower-pitch|slow|fast|sing-song|singing|laugh-speak|emphasis)\s*>/gi,
      ""
    )
    .replace(/\s{2,}/g, " ")
    .trim();
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/** Deterministic waveform heights (15–95%) */
function generateWaveformHeights(count: number): number[] {
  let seed = 42;
  const rand = () => {
    seed = (seed * 16807 + 12345) & 0x7fffffff;
    return (seed & 0xffff) / 0xffff;
  };
  return Array.from({ length: count }, (_, i) => {
    const t = i / count;
    const envelope = 0.35 + Math.sin(t * Math.PI) * 0.25;
    const noise = rand() * 0.45;
    return Math.max(15, Math.min(95, (envelope + noise) * 100));
  });
}

const waveformHeights = generateWaveformHeights(BAR_COUNT);
const TOTAL_W = BAR_COUNT * SLOT_W;

/* ─── Waveform bar ─── */
function WaveformBar({
  height,
  index,
  progress,
}: {
  height: number;
  index: number;
  progress: number; // 0–1
}) {
  // Center of this bar in 0–1 space
  const barCenter = (index + 0.5) / BAR_COUNT;
  // Distance from playhead in "bar units"
  const dist = Math.abs(barCenter - progress) * BAR_COUNT;
  const isPlayed = barCenter <= progress;

  // Graduated highlight: bar at playhead = boldest, ±2 bars glow falloff
  let opacity: number;
  let scale: number;
  if (dist < 0.6) {
    // Active bar (at playhead)
    opacity = 1;
    scale = 1.25;
  } else if (dist < 2.5) {
    // Nearby bars (±2) — smooth falloff
    const t = (dist - 0.6) / 1.9; // 0→1 over the 2-bar range
    opacity = isPlayed ? 0.85 - t * 0.2 : 0.55 - t * 0.25;
    scale = 1 + (1 - t) * 0.1;
  } else if (isPlayed) {
    opacity = 0.6;
    scale = 1;
  } else {
    opacity = 0.18;
    scale = 1;
  }

  return (
    <div
      style={{
        width: SLOT_W,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
        flexShrink: 0,
      }}
    >
      <div
        style={{
          width: BAR_W,
          height: `${height}%`,
          backgroundColor: accent,
          borderRadius: 1.5,
          opacity,
          transform: `scaleY(${scale})`,
          transition: "opacity 0.12s, transform 0.12s",
        }}
      />
    </div>
  );
}

/* ─── Main component ─── */
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
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  const [containerW, setContainerW] = useState(400);

  // Drag state
  const isDraggingRef = useRef(false);
  const wasPlayingRef = useRef(false);
  const dragStartXRef = useRef(0);
  const dragStartProgressRef = useRef(0);

  // Measure container width properly via ResizeObserver
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      setContainerW(entry.contentRect.width);
    });
    ro.observe(el);
    setContainerW(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  // 60fps smooth scroll during playback via rAF
  useEffect(() => {
    if (!isPlaying) return;
    let raf: number;
    const tick = () => {
      const audio = audioRef.current;
      if (audio && !isDraggingRef.current) {
        setCurrentTime(audio.currentTime);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isPlaying]);

  const progress = duration > 0 ? currentTime / duration : 0;

  // Scroll offset: maps progress (0–1) to translateX so the "playhead" (center) aligns
  const halfContainer = containerW / 2;
  const scrollOffset = -progress * TOTAL_W + halfContainer;

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
    } else {
      if (audio.duration && audio.currentTime >= audio.duration - 0.1) {
        audio.currentTime = 0;
      }
      setIsLoading(true);
      audio.play().finally(() => setIsLoading(false));
    }
  }, [isPlaying]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onTime = () => {
      if (!isDraggingRef.current) setCurrentTime(audio.currentTime);
    };
    const onMeta = () => setDuration(audio.duration);
    const onEnd = () => setIsPlaying(false);

    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onMeta);
    audio.addEventListener("ended", onEnd);
    return () => {
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onMeta);
      audio.removeEventListener("ended", onEnd);
    };
  }, [mediaUrl]);

  // Pointer-based drag for scrubbing
  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      isDraggingRef.current = true;
      dragStartXRef.current = e.clientX;
      dragStartProgressRef.current = progress;

      const audio = audioRef.current;
      if (audio && !audio.paused) {
        wasPlayingRef.current = true;
        audio.pause();
      } else {
        wasPlayingRef.current = false;
      }

      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [progress]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDraggingRef.current || !duration) return;
      const dx = e.clientX - dragStartXRef.current;
      // Dragging left = forward (positive dx moves waveform left = progress increases)
      // Each pixel of drag = some fraction of total width
      const progressDelta = -dx / TOTAL_W;
      const newProgress = Math.max(
        0,
        Math.min(1, dragStartProgressRef.current + progressDelta)
      );
      const newTime = newProgress * duration;
      setCurrentTime(newTime);
    },
    [duration]
  );

  const handlePointerUp = useCallback(() => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;

    const audio = audioRef.current;
    if (audio && duration) {
      audio.currentTime = currentTime;
    }
    if (wasPlayingRef.current) {
      audioRef.current?.play();
      wasPlayingRef.current = false;
    }
  }, [currentTime, duration]);

  /* No audio yet — placeholder */
  if (!mediaUrl) {
    return (
      <div className="mx-auto max-w-3xl">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, ease }}
          className="rounded-2xl border border-gray-900/10 bg-white/50 px-8 py-12 text-center backdrop-blur-xl dark:border-white/15 dark:bg-white/10"
        >
          <p className="text-sm text-gray-900/50 dark:text-white/50">
            Podcast Audio Generating...
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      {/* Player card */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, ease }}
        className="overflow-hidden rounded-2xl border border-[#5227FF]/20 bg-[#5227FF]/5 p-5 backdrop-blur-xl dark:border-[#5227FF]/30 dark:bg-[#5227FF]/10"
      >
        <audio ref={audioRef} src={mediaUrl} preload="metadata" onContextMenu={(e) => e.preventDefault()} />

        <div className="flex flex-col items-center gap-4">
          {/* Waveform scrubber */}
          <div
            ref={containerRef}
            className="relative h-12 w-full cursor-grab select-none overflow-hidden active:cursor-grabbing sm:h-14"
            style={{ touchAction: "none" }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
          >
            {/* Playhead center line */}
            <div
              className="pointer-events-none absolute left-1/2 top-0 z-10 h-full w-px -translate-x-1/2 rounded-full"
              style={{ backgroundColor: accent, opacity: 0.5 }}
            />

            {/* Edge fade mask */}
            <div
              className="flex h-full w-full items-center"
              style={{
                maskImage:
                  "linear-gradient(to right, transparent 0%, #000 15%, #000 85%, transparent 100%)",
                WebkitMaskImage:
                  "linear-gradient(to right, transparent 0%, #000 15%, #000 85%, transparent 100%)",
              }}
            >
              {/* Sliding waveform track */}
              <div
                className="flex h-full items-center"
                style={{
                  transform: `translateX(${scrollOffset}px)`,
                  width: TOTAL_W,
                  willChange: isDraggingRef.current ? "transform" : undefined,
                }}
              >
                {waveformHeights.map((h, i) => (
                  <WaveformBar
                    key={i}
                    height={h}
                    index={i}
                    progress={progress}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Play / Pause */}
          <button
            onClick={togglePlay}
            disabled={isLoading}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-[#5227FF] text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            {isLoading ? (
              <CircleNotch size={20} weight="duotone" className="animate-spin" />
            ) : isPlaying ? (
              <Pause size={20} weight="duotone" />
            ) : (
              <Play size={20} weight="duotone" />
            )}
          </button>

          {/* Time */}
          <div className="text-center text-[11px] tabular-nums text-gray-900/50 dark:text-white/50">
            {formatTime(currentTime)} /{" "}
            {duration ? formatTime(duration) : "--:--"}
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

      {/* Transcript content */}
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
