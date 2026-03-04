"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";

const ease = [0.25, 0.46, 0.45, 0.94] as const;

interface CodeDisplayProps {
  code: string;
  expiresAt: string;
  onExpired: () => void;
}

export function CodeDisplay({ code, expiresAt, onExpired }: CodeDisplayProps) {
  const [secondsLeft, setSecondsLeft] = useState(() => {
    return Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
  });
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      const remaining = Math.max(
        0,
        Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000)
      );
      setSecondsLeft(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
        onExpired();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresAt, onExpired]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const portalUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/portal`;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4, ease }}
      className="mt-4 rounded-xl bg-gray-900/5 p-4 dark:bg-white/5"
    >
      {/* Code */}
      <div className="flex items-center justify-center gap-1">
        {code.split("").map((char, i) => (
          <motion.span
            key={i}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, ease, delay: i * 0.05 }}
            className="flex h-9 w-8 items-center justify-center rounded-md bg-gray-900/10 font-mono text-lg font-bold text-gray-900 dark:bg-white/10 dark:text-white"
          >
            {char}
          </motion.span>
        ))}
      </div>

      {/* Copy + Timer */}
      <div className="mt-3 flex items-center justify-between">
        <button
          onClick={handleCopy}
          className="text-xs text-gray-900/50 transition-colors hover:text-gray-900/80 dark:text-white/50 dark:hover:text-white/80"
        >
          {copied ? "Copied!" : "Copy Code"}
        </button>
        <span
          className={`text-xs font-mono ${
            secondsLeft <= 15
              ? "text-red-500"
              : "text-gray-900/50 dark:text-white/50"
          }`}
        >
          {secondsLeft}s
        </span>
      </div>

      {/* QR Code */}
      <div className="mt-3 flex justify-center">
        <div className="rounded-lg bg-white p-2">
          <QRCodeSVG value={portalUrl} size={80} />
        </div>
      </div>
      <p className="mt-1 text-center text-[10px] text-gray-900/30 dark:text-white/30">
        Scan To Open Portal
      </p>
    </motion.div>
  );
}
