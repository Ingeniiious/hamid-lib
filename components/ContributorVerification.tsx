"use client";

import { useState, useTransition, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GrainientButton } from "@/components/GrainientButton";
import { FadeImage, preloadImages } from "@/components/FadeImage";
import {
  sendContributorOTP,
  verifyContributorOTP,
} from "@/app/(main)/dashboard/contribute/actions";

const ease = [0.25, 0.46, 0.45, 0.94] as const;
const CDN = "https://lib.thevibecodedcompany.com";

const IMAGES = {
  mail: `${CDN}/images/mail-verify.webp`,
  badge: `${CDN}/images/verified-badge.webp`,
  expert: `${CDN}/images/expert.webp`,
};

type Step = "email-input" | "otp-verify" | "success" | "manual-review";

export function ContributorVerification() {
  const [step, setStep] = useState<Step>("email-input");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [universityName, setUniversityName] = useState("");
  const [reviewMessage, setReviewMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  // Aggressively preload all images on mount so they're cached for later steps
  useEffect(() => {
    preloadImages([IMAGES.mail, IMAGES.badge, IMAGES.expert]);
  }, []);

  function handleSendOTP() {
    setError("");
    startTransition(async () => {
      const result = await sendContributorOTP(email);
      if (result.error) {
        setError(result.error);
        return;
      }
      setStep("otp-verify");
    });
  }

  function handleVerifyOTP(value: string) {
    if (value.length !== 6) return;
    setError("");
    startTransition(async () => {
      const result = await verifyContributorOTP(email, value);
      if (result.error) {
        setError(result.error);
        setOtp("");
        return;
      }

      if (result.autoVerified) {
        setUniversityName(result.universityName || "");
        setStep("success");
      } else {
        setReviewMessage(
          result.message ||
            "We need to manually verify this email domain. You'll hear from us soon."
        );
        setStep("manual-review");
      }
    });
  }

  return (
    <div className="flex min-h-full flex-col items-center justify-center px-6">
      <AnimatePresence mode="wait">
        {step === "email-input" && (
          <motion.div
            key="email"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease }}
            className="mx-auto w-full max-w-md text-center"
          >
            <div className="rounded-2xl border border-gray-900/10 bg-white/50 p-8 backdrop-blur-xl dark:border-white/15 dark:bg-white/10">
              <h2 className="font-display text-2xl font-light text-gray-900 dark:text-white">
                Become A Contributor
              </h2>
              <p className="mt-3 text-sm text-gray-900/50 dark:text-white/50">
                Enter your university email and we&apos;ll send you a
                verification code.
              </p>

              <div className="mt-8 space-y-4">
                <Input
                  type="email"
                  placeholder="you@university.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSendOTP()}
                  className="text-center"
                  disabled={isPending}
                />

                {error && (
                  <p className="text-sm text-red-500 dark:text-red-400">
                    {error}
                  </p>
                )}

                <Button
                  onClick={handleSendOTP}
                  disabled={isPending || !email.includes("@")}
                  className="w-full rounded-full bg-[#5227FF] font-medium text-white hover:opacity-90 disabled:opacity-50"
                >
                  {isPending ? "Sending..." : "Send Verification Code"}
                </Button>
              </div>
            </div>
          </motion.div>
        )}

        {step === "otp-verify" && (
          <motion.div
            key="otp"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease }}
            className="relative mx-auto w-full max-w-md text-center"
          >
            {/* Mail illustration — absolutely positioned above card */}
            <FadeImage
              src={IMAGES.mail}
              className="absolute left-1/2 bottom-full mb-4 h-[240px] w-auto -translate-x-1/2 object-contain"
            />

            <div className="rounded-2xl border border-gray-900/10 bg-white/50 p-8 backdrop-blur-xl dark:border-white/15 dark:bg-white/10">
              <h2 className="font-display text-2xl font-light text-gray-900 dark:text-white">
                Check Your Email
              </h2>
              <p className="mt-3 text-sm text-gray-900/50 dark:text-white/50">
                We sent a 6-digit code to{" "}
                <span className="font-medium text-gray-900/70 dark:text-white/70">
                  {email}
                </span>
              </p>

              <div className="mt-8 flex flex-col items-center gap-4">
                <InputOTP
                  maxLength={6}
                  value={otp}
                  onChange={(value) => {
                    setOtp(value);
                    handleVerifyOTP(value);
                  }}
                  disabled={isPending}
                >
                  <InputOTPGroup>
                    {Array.from({ length: 6 }).map((_, i) => (
                      <InputOTPSlot key={i} index={i} />
                    ))}
                  </InputOTPGroup>
                </InputOTP>

                {error && (
                  <p className="text-sm text-red-500 dark:text-red-400">
                    {error}
                  </p>
                )}

                {isPending && (
                  <p className="text-sm text-gray-900/50 dark:text-white/50">
                    Verifying...
                  </p>
                )}

                <button
                  onClick={() => {
                    setStep("email-input");
                    setOtp("");
                    setError("");
                  }}
                  className="text-sm text-gray-900/40 underline hover:text-gray-900/60 dark:text-white/40 dark:hover:text-white/60"
                >
                  Use A Different Email
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {step === "success" && (
          <motion.div
            key="success"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease }}
            className="mx-auto w-full max-w-md text-center"
          >
            <div className="rounded-2xl border border-gray-900/10 bg-white/50 p-8 backdrop-blur-xl dark:border-white/15 dark:bg-white/10">
              <FadeImage
                src={IMAGES.badge}
                alt="Verified"
                className="mx-auto h-[160px] w-auto object-contain"
              />

              <h2 className="mt-6 font-display text-2xl font-light text-gray-900 dark:text-white">
                You&apos;re Verified!
              </h2>
              {universityName && (
                <p className="mt-2 text-sm text-gray-900/40 dark:text-white/40">
                  {universityName}
                </p>
              )}
              <p className="mt-3 text-sm text-gray-900/50 dark:text-white/50">
                Here&apos;s your contributor badge. It&apos;ll appear next to
                your name across Libraryyy.
              </p>

              <div className="mt-4 inline-flex items-center gap-2 text-sm text-gray-900/60 dark:text-white/60">
                <FadeImage
                  src={IMAGES.badge}
                  alt="Badge"
                  className="h-5 w-5 object-contain"
                />
                <span>Verified Contributor</span>
              </div>

              <div className="mt-6">
                <GrainientButton
                  href="#"
                  onClick={() => window.location.reload()}
                >
                  Start Contributing
                </GrainientButton>
              </div>
            </div>
          </motion.div>
        )}

        {step === "manual-review" && (
          <motion.div
            key="review"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease }}
            className="mx-auto w-full max-w-md text-center"
          >
            <div className="rounded-2xl border border-amber-500/20 bg-amber-50/50 p-8 backdrop-blur-xl dark:border-amber-500/15 dark:bg-amber-950/10">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/10">
                <svg
                  className="h-8 w-8 text-amber-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h2 className="font-display text-2xl font-light text-gray-900 dark:text-white">
                Almost There!
              </h2>
              <p className="mt-3 text-sm text-gray-900/60 dark:text-white/60">
                {reviewMessage}
              </p>
              <p className="mt-4 text-xs text-gray-900/40 dark:text-white/40">
                Email verified:{" "}
                <span className="font-medium">{email}</span>
              </p>
              <Button
                onClick={() => (window.location.href = "/dashboard")}
                variant="outline"
                className="mt-6 w-full"
              >
                Back To Dashboard
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
