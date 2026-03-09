"use client";

import { animate, type DOMKeyframesDefinition, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";

/**
 * Physics model derived from canvas-confetti by Kiril Vatev
 * Copyright (c) 2020, Kiril Vatev — ISC License
 * https://github.com/catdad/canvas-confetti
 */

const COLORS = [
  "#26ccff",
  "#a25afd",
  "#ff5e7e",
  "#88ff5a",
  "#fcff42",
  "#ffa62d",
  "#ff36ff",
];

const SHAPES: Particle["shape"][] = [
  "circle",
  "rect",
  "rect",
  "strip",
  "strip",
];

const KEYFRAME_STEPS = 40;
const SCALE_DURATION_FRACTION = 0.08;

interface Particle {
  keyframes: DOMKeyframesDefinition;
  duration: number;
  size: number;
  color: string;
  shape: "circle" | "rect" | "strip";
}

interface ConfettiBurstProps {
  particleCount?: number;
  startVelocity?: number;
  spread?: number;
  decay?: number;
  gravity?: number;
  drift?: number;
  duration?: number;
  size?: number;
  colors?: string[];
}

function computeKeyframes(params: {
  angle: number;
  startVelocity: number;
  decay: number;
  gravity: number;
  drift: number;
  wobbleSpeed: number;
  wobbleOffset: number;
  size: number;
  ticks: number;
  tiltRotations: number;
  rotation: number;
}) {
  const {
    angle,
    startVelocity,
    decay,
    gravity,
    drift,
    wobbleSpeed,
    wobbleOffset,
    size,
    ticks,
    tiltRotations,
    rotation,
  } = params;

  const transform: string[] = [];
  const opacity: number[] = [];

  let velocity = startVelocity;
  let x = 0;
  let y = 0;
  let wobble = wobbleOffset;
  let tick = 0;

  for (let step = 0; step <= KEYFRAME_STEPS; step++) {
    const t = step / KEYFRAME_STEPS;

    if (step > 0) {
      const targetTick = Math.round((step * ticks) / KEYFRAME_STEPS);
      while (tick < targetTick) {
        x += Math.cos(angle) * velocity + drift;
        y += Math.sin(angle) * velocity + gravity * 3;
        velocity *= decay;
        wobble += wobbleSpeed;
        tick++;
      }
    }

    const wx = step === 0 ? 0 : x + Math.cos(wobble) * 15 * size;
    const wy = y;

    let scale: number;
    if (t < SCALE_DURATION_FRACTION * 0.6) {
      scale = (t / (SCALE_DURATION_FRACTION * 0.6)) * 1.15;
    } else if (t < SCALE_DURATION_FRACTION) {
      const st =
        (t - SCALE_DURATION_FRACTION * 0.6) /
        (SCALE_DURATION_FRACTION * 0.4);
      scale = 1.15 - st * 0.15;
    } else {
      scale = 1;
    }

    const rotateY = tiltRotations * 360 * t;

    let opacityKeyframe: number;
    if (t <= 0.5) {
      opacityKeyframe = 1;
    } else if (t <= 0.8) {
      opacityKeyframe = 1 - ((t - 0.5) / 0.3) * 0.5;
    } else {
      opacityKeyframe = 0.5 - ((t - 0.8) / 0.2) * 0.5;
    }

    transform.push(
      `translate(${wx}px, ${wy}px) scale(${scale}) rotateY(${rotateY}deg) rotate(${rotation}deg)`
    );
    opacity.push(opacityKeyframe);
  }

  return { transform, opacity };
}

function ConfettiPiece({ particle }: { particle: Particle }) {
  const ref = useRef<HTMLDivElement>(null);
  const { keyframes, duration, size, color, shape } = particle;

  const width =
    shape === "strip" ? size * 0.3 : shape === "rect" ? size * 0.7 : size;
  const height = shape === "strip" ? size * 2 : size;
  const borderRadius =
    shape === "circle" ? "50%" : shape === "strip" ? size * 0.12 : 2;

  useEffect(() => {
    if (!ref.current) return;
    const animation = animate(ref.current, keyframes, {
      duration,
      ease: "linear",
    });
    return () => animation.cancel();
  }, [keyframes, duration]);

  return (
    <div
      ref={ref}
      style={{
        position: "absolute",
        width,
        height,
        borderRadius,
        backgroundColor: color,
        willChange: "transform, opacity",
        pointerEvents: "none",
      }}
    />
  );
}

function generateParticles(opts: {
  particleCount: number;
  startVelocity: number;
  spread: number;
  decay: number;
  gravity: number;
  drift: number;
  duration: number;
  size: number;
  colors: string[];
}): Particle[] {
  const ticks = Math.round(opts.duration * 60);

  return Array.from({ length: opts.particleCount }, () => {
    const radSpread = opts.spread * (Math.PI / 180);
    const angle =
      -Math.PI / 2 + (0.5 * radSpread - Math.random() * radSpread);
    const velocity =
      opts.startVelocity * 0.5 + Math.random() * opts.startVelocity;
    const wobbleSpeed = Math.min(0.11, Math.random() * 0.1 + 0.05);
    const wobbleOffset = Math.random() * 10;
    const pieceSize = 6 * opts.size + Math.random() * 6 * opts.size;
    const tiltRotations = 2 + Math.random() * 4;
    const rotation = Math.random() * 360;

    const keyframes = computeKeyframes({
      angle,
      startVelocity: velocity,
      decay: opts.decay,
      gravity: opts.gravity,
      drift: opts.drift,
      wobbleSpeed,
      wobbleOffset,
      size: opts.size,
      ticks,
      tiltRotations,
      rotation,
    });

    return {
      keyframes,
      duration: opts.duration,
      size: pieceSize,
      color: opts.colors[Math.floor(Math.random() * opts.colors.length)],
      shape: SHAPES[Math.floor(Math.random() * SHAPES.length)],
    };
  });
}

export default function ConfettiBurst({
  particleCount = 80,
  startVelocity = 30,
  spread = 120,
  decay = 0.91,
  gravity = 1,
  drift = 0,
  duration = 2.5,
  size = 1,
  colors = COLORS,
}: ConfettiBurstProps) {
  const [particles] = useState(() =>
    generateParticles({
      particleCount,
      startVelocity,
      spread,
      decay,
      gravity,
      drift,
      duration,
      size,
      colors,
    })
  );

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 50,
        pointerEvents: "none",
      }}
    >
      {/* Burst origin — center of screen */}
      <div style={{ position: "relative" }}>
        {particles.map((p, i) => (
          <ConfettiPiece key={i} particle={p} />
        ))}
      </div>
    </div>
  );
}
