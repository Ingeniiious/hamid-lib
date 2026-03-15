"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play,
  Pause,
  SpeakerHigh,
  SpeakerSlash,
  CornersOut,
  CornersIn,
  CircleNotch,
} from "@phosphor-icons/react";
import type { VideoScriptContent } from "@/lib/ai/types";

const ease = [0.25, 0.46, 0.45, 0.94] as const;
const accent = "#5227FF";

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

interface VideoScriptRendererProps {
  content: VideoScriptContent;
  mediaUrl?: string | null;
}

export function VideoScriptRenderer({
  content,
  mediaUrl,
}: VideoScriptRendererProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout>>(null);

  const progress = duration > 0 ? currentTime / duration : 0;

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (isPlaying) {
      video.pause();
    } else {
      if (video.duration && video.currentTime >= video.duration - 0.1) {
        video.currentTime = 0;
      }
      setIsLoading(true);
      video.play().finally(() => setIsLoading(false));
    }
  }, [isPlaying]);

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setIsMuted(video.muted);
  }, []);

  const toggleFullscreen = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      el.requestFullscreen();
    }
  }, []);

  const seek = useCallback(
    (delta: number) => {
      const video = videoRef.current;
      if (!video) return;
      video.currentTime = Math.max(
        0,
        Math.min(video.duration || 0, video.currentTime + delta)
      );
      setCurrentTime(video.currentTime);
    },
    []
  );

  // Fullscreen change
  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  // Video event listeners
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onDuration = () => {
      if (video.duration && isFinite(video.duration)) {
        setDuration(video.duration);
      }
    };
    const onEnd = () => setIsPlaying(false);
    const onTimeUpdate = () => setCurrentTime(video.currentTime);

    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    video.addEventListener("loadedmetadata", onDuration);
    video.addEventListener("durationchange", onDuration);
    video.addEventListener("canplay", onDuration);
    video.addEventListener("ended", onEnd);
    video.addEventListener("timeupdate", onTimeUpdate);
    return () => {
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("loadedmetadata", onDuration);
      video.removeEventListener("durationchange", onDuration);
      video.removeEventListener("canplay", onDuration);
      video.removeEventListener("ended", onEnd);
      video.removeEventListener("timeupdate", onTimeUpdate);
    };
  }, [mediaUrl]);

  // 60fps time tracking during playback (supplements timeupdate for smooth bar)
  useEffect(() => {
    if (!isPlaying) return;
    let raf: number;
    const tick = () => {
      const video = videoRef.current;
      if (video) setCurrentTime(video.currentTime);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isPlaying]);

  // Auto-hide controls after 3s during playback
  const resetHideTimer = useCallback(() => {
    setShowControls(true);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    if (isPlaying) {
      hideTimerRef.current = setTimeout(() => setShowControls(false), 3000);
    }
  }, [isPlaying]);

  useEffect(() => {
    if (!isPlaying) {
      setShowControls(true);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    } else {
      resetHideTimer();
    }
  }, [isPlaying, resetHideTimer]);

  // Click to seek on progress bar
  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const video = videoRef.current;
    const bar = progressRef.current;
    if (!video || !bar || !duration) return;
    const rect = bar.getBoundingClientRect();
    const ratio = Math.max(
      0,
      Math.min(1, (e.clientX - rect.left) / rect.width)
    );
    video.currentTime = ratio * duration;
    setCurrentTime(ratio * duration);
  };

  // Keyboard controls
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case " ":
        case "k":
          e.preventDefault();
          togglePlay();
          break;
        case "ArrowRight":
          e.preventDefault();
          seek(5);
          resetHideTimer();
          break;
        case "ArrowLeft":
          e.preventDefault();
          seek(-5);
          resetHideTimer();
          break;
        case "ArrowUp":
          e.preventDefault();
          if (videoRef.current)
            videoRef.current.volume = Math.min(
              1,
              videoRef.current.volume + 0.1
            );
          break;
        case "ArrowDown":
          e.preventDefault();
          if (videoRef.current)
            videoRef.current.volume = Math.max(
              0,
              videoRef.current.volume - 0.1
            );
          break;
        case "m":
          e.preventDefault();
          toggleMute();
          break;
        case "f":
          e.preventDefault();
          toggleFullscreen();
          break;
      }
    },
    [togglePlay, seek, toggleMute, toggleFullscreen, resetHideTimer]
  );

  // No video yet — placeholder
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
            Video Generating...
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, ease }}
        ref={containerRef}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        className="group relative overflow-hidden rounded-2xl border border-[#5227FF]/20 bg-black outline-none dark:border-[#5227FF]/30"
        onMouseMove={resetHideTimer}
        onMouseLeave={() => isPlaying && setShowControls(false)}
      >
        {/* Video element — no native controls */}
        <video
          ref={videoRef}
          src={mediaUrl}
          preload="metadata"
          className="w-full cursor-pointer"
          onClick={togglePlay}
          onContextMenu={(e) => e.preventDefault()}
          playsInline
        />

        {/* Big center play button + loading spinner */}
        <AnimatePresence>
          {!isPlaying && !isLoading && (
            <motion.button
              key="play-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3, ease }}
              onClick={togglePlay}
              className="absolute inset-0 flex items-center justify-center bg-black/20"
            >
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={{ duration: 0.3, ease }}
                className="flex h-16 w-16 items-center justify-center rounded-full bg-[#5227FF] text-white shadow-lg"
              >
                <Play size={28} weight="duotone" />
              </motion.div>
            </motion.button>
          )}

          {isLoading && (
            <motion.div
              key="loading-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3, ease }}
              className="absolute inset-0 flex items-center justify-center bg-black/20"
            >
              <CircleNotch
                size={40}
                weight="duotone"
                className="animate-spin text-white"
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bottom controls overlay */}
        <div
          className="absolute inset-x-0 bottom-0 transition-opacity duration-300"
          style={{
            opacity: showControls ? 1 : 0,
            pointerEvents: showControls ? "auto" : "none",
            background: "linear-gradient(transparent, rgba(0,0,0,0.7))",
          }}
        >
          <div className="px-4 pb-3 pt-8">
            {/* Progress bar */}
            <div
              ref={progressRef}
              className="mb-3 h-1.5 w-full cursor-pointer rounded-full bg-white/20 transition-all hover:h-2.5"
              onClick={handleSeek}
            >
              <div
                className="pointer-events-none h-full rounded-full"
                style={{
                  width: `${progress * 100}%`,
                  backgroundColor: accent,
                }}
              />
            </div>

            {/* Controls row */}
            <div className="flex items-center justify-center gap-4">
              {/* Play/Pause */}
              <button
                onClick={togglePlay}
                className="flex h-8 w-8 items-center justify-center rounded-full text-white transition-opacity hover:opacity-80"
                aria-label={isPlaying ? "Pause" : "Play"}
              >
                {isPlaying ? (
                  <Pause size={18} weight="duotone" />
                ) : (
                  <Play size={18} weight="duotone" />
                )}
              </button>

              {/* Time */}
              <span className="text-[11px] tabular-nums text-white/70">
                {formatTime(currentTime)} /{" "}
                {duration ? formatTime(duration) : "--:--"}
              </span>

              {/* Mute */}
              <button
                onClick={toggleMute}
                className="flex h-8 w-8 items-center justify-center rounded-full text-white transition-opacity hover:opacity-80"
                aria-label={isMuted ? "Unmute" : "Mute"}
              >
                {isMuted ? (
                  <SpeakerSlash size={18} weight="duotone" />
                ) : (
                  <SpeakerHigh size={18} weight="duotone" />
                )}
              </button>

              {/* Fullscreen */}
              <button
                onClick={toggleFullscreen}
                className="flex h-8 w-8 items-center justify-center rounded-full text-white transition-opacity hover:opacity-80"
                aria-label={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
              >
                {isFullscreen ? (
                  <CornersIn size={18} weight="duotone" />
                ) : (
                  <CornersOut size={18} weight="duotone" />
                )}
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
