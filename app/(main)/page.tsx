"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";
import Link from "next/link";
import { QrCode, Door } from "@phosphor-icons/react";

const ease = [0.25, 0.46, 0.45, 0.94] as const;

export default function Home() {
  const [showQR, setShowQR] = useState(false);

  return (
    <div className="flex w-full flex-col items-center justify-center">
      <div className="flex flex-col items-center px-6 text-center">
        <AnimatePresence mode="wait">
          {!showQR ? (
            <motion.div
              key="landing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5, ease }}
              className="flex flex-col items-center gap-6 sm:gap-8"
            >
              <motion.h1
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.8, ease }}
                className="font-display text-5xl font-light tracking-tight text-white sm:text-7xl md:text-8xl"
              >
                Libraryyy
              </motion.h1>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.8, ease, delay: 0.2 }}
              >
                <Link
                  href="/auth"
                  className="inline-flex items-center rounded-full bg-white/10 px-8 py-3 text-sm font-medium text-white backdrop-blur-sm transition-all duration-300 hover:bg-white/20 sm:px-10 sm:py-3.5 sm:text-base"
                >
                  Get Started
                </Link>
              </motion.div>
            </motion.div>
          ) : (
            <motion.div
              key="qr"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5, ease }}
              className="fixed inset-0 z-20 flex cursor-pointer flex-col items-center justify-center gap-6"
              onClick={() => setShowQR(false)}
            >
              <div className="rounded-2xl border border-white/20 bg-white/10 p-5 shadow-2xl backdrop-blur-xl sm:p-6">
                <QRCodeSVG
                  value="https://libraryyy.com"
                  size={200}
                  level="M"
                  bgColor="transparent"
                  fgColor="#ffffff"
                />
              </div>
              <p className="text-sm text-white/50">Tap Anywhere To Go Back</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom Action Buttons */}
      {!showQR && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, ease, delay: 0.6 }}
          className="absolute bottom-8 z-10 flex items-center gap-3 sm:bottom-10"
        >
          <button
            onClick={() => setShowQR(true)}
            aria-label="Show QR Code"
            className="rounded-full bg-white/10 p-3 text-white/70 backdrop-blur-sm transition-all duration-300 hover:bg-white/20 hover:text-white"
          >
            <QrCode size={20} weight="duotone" />
          </button>
          <Link
            href="/portal"
            aria-label="Portal"
            className="rounded-full bg-white/10 p-3 text-white/70 backdrop-blur-sm transition-all duration-300 hover:bg-white/20 hover:text-white"
          >
            <Door size={20} weight="duotone" />
          </Link>
        </motion.div>
      )}
    </div>
  );
}
