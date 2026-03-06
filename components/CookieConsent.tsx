"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";

const ease = [0.25, 0.46, 0.45, 0.94] as const;

export function CookieConsent() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem("analytics-consent");
    if (!consent) setShow(true);
  }, []);

  const handleAccept = () => {
    localStorage.setItem("analytics-consent", "accepted");
    setShow(false);
  };

  const handleDecline = () => {
    localStorage.setItem("analytics-consent", "declined");
    setShow(false);
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.4, ease }}
          className="fixed bottom-4 left-1/2 z-50 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 rounded-2xl border border-gray-900/10 bg-white/80 p-5 text-center shadow-lg backdrop-blur-xl dark:border-white/15 dark:bg-gray-900/80 sm:bottom-6"
        >
          <Image
            src="https://lib.thevibecodedcompany.com/images/cookies.webp"
            alt="Two students sharing a cookie"
            width={160}
            height={160}
            className="mx-auto mb-3"
            priority
          />
          <p className="mb-1 text-sm font-medium text-gray-900 dark:text-white">
            Wanna Share Some Cookies?
          </p>
          <p className="mb-4 text-xs text-gray-900/50 dark:text-white/50">
            We use cookies to make your study sessions smoother.
          </p>
          <div className="flex justify-center gap-2">
            <Button
              onClick={handleAccept}
              size="sm"
              className="rounded-full"
            >
              Accept All
            </Button>
            <Button
              onClick={handleDecline}
              variant="outline"
              size="sm"
              className="rounded-full border-gray-900/15 dark:border-white/15"
            >
              Accept Necessary
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
