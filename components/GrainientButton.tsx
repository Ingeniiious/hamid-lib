"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import dynamic from "next/dynamic";

const Grainient = dynamic(() => import("@/components/Grainient"), {
  ssr: false,
});

const ease = [0.25, 0.46, 0.45, 0.94] as const;

interface GrainientButtonProps {
  href: string;
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export function GrainientButton({
  href,
  children,
  className = "",
  onClick,
}: GrainientButtonProps) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setReady(true), 150);
    return () => clearTimeout(t);
  }, []);

  const inner = (
    <motion.span
      whileHover={{ scale: 1.03 }}
      transition={{ duration: 0.3, ease }}
      className={`relative inline-flex items-center justify-center overflow-hidden rounded-full px-8 py-3 text-sm font-medium ${className}`}
    >
      {/* Grainient background */}
      <span
        className="absolute inset-0 z-0 overflow-hidden rounded-full transition-opacity duration-700 ease-[cubic-bezier(0.25,0.46,0.45,0.94)]"
        style={{ opacity: ready ? 1 : 0 }}
      >
        <Grainient
          timeSpeed={0.6}
          grainAmount={0.08}
          contrast={1.3}
          saturation={0.8}
          zoom={0.6}
          warpSpeed={3.0}
          warpAmplitude={40}
          color1="#FF9FFC"
          color2="#5227FF"
          color3="#B19EEF"
        />
      </span>

      {/* Semi-transparent overlay for readability */}
      <span className="absolute inset-0 z-[1] rounded-full bg-white/60 dark:bg-gray-950/50" />

      {/* Text */}
      <span className="relative z-10 text-gray-900 dark:text-white">
        {children}
      </span>
    </motion.span>
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className="inline-block">
        {inner}
      </button>
    );
  }

  return <Link href={href}>{inner}</Link>;
}
