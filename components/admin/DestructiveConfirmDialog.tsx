"use client";

import { useState, useTransition, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
  InputOTPSeparator,
} from "@/components/ui/input-otp";
import {
  sendDestructiveOTP,
  verifyDestructiveOTP,
} from "@/lib/admin/destructive-otp";

const ease = [0.25, 0.46, 0.45, 0.94] as const;

type Step = "confirm" | "otp";

interface DestructiveConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  onConfirmed: () => void;
}

export function DestructiveConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  onConfirmed,
}: DestructiveConfirmDialogProps) {
  const [step, setStep] = useState<Step>("confirm");
  const [otpCode, setOtpCode] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const [countdown, setCountdown] = useState(0);

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (!open) {
      // Delay reset so exit animation can play
      const timer = setTimeout(() => {
        setStep("confirm");
        setOtpCode("");
        setError("");
        setCountdown(0);
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [open]);

  // Countdown timer for resend
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => setCountdown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  const handleSendOTP = useCallback(() => {
    setError("");
    startTransition(async () => {
      const result = await sendDestructiveOTP();
      if (result.error) {
        setError(result.error);
        return;
      }
      setStep("otp");
      setCountdown(90);
    });
  }, []);

  const handleVerifyOTP = useCallback(
    (code: string) => {
      if (code.length !== 6) return;
      setError("");
      startTransition(async () => {
        const result = await verifyDestructiveOTP(code);
        if (result.error) {
          setError(result.error);
          setOtpCode("");
          return;
        }
        onOpenChange(false);
        onConfirmed();
      });
    },
    [onConfirmed, onOpenChange]
  );

  const handleResend = useCallback(() => {
    setOtpCode("");
    setError("");
    handleSendOTP();
  }, [handleSendOTP]);

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="rounded-2xl border-gray-900/15 bg-white/90 backdrop-blur-xl dark:border-white/15 dark:bg-gray-900/90">
        <AnimatePresence mode="wait">
          {step === "confirm" ? (
            <motion.div
              key="confirm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease }}
            >
              <AlertDialogHeader>
                <AlertDialogTitle className="font-display font-light">
                  {title}
                </AlertDialogTitle>
                <AlertDialogDescription>{description}</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="mt-4">
                <AlertDialogCancel className="rounded-full">
                  Cancel
                </AlertDialogCancel>
                <Button
                  onClick={handleSendOTP}
                  disabled={isPending}
                  className="rounded-full bg-red-600 text-white hover:bg-red-700"
                >
                  {isPending ? "Sending Code..." : "Continue"}
                </Button>
              </AlertDialogFooter>
            </motion.div>
          ) : (
            <motion.div
              key="otp"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease }}
            >
              <AlertDialogHeader>
                <AlertDialogTitle className="font-display font-light">
                  Enter Verification Code
                </AlertDialogTitle>
                <AlertDialogDescription>
                  A 6-digit code has been sent to your email. Enter it below to
                  confirm this action.
                </AlertDialogDescription>
              </AlertDialogHeader>

              <div className="mt-6 flex flex-col items-center gap-4">
                <InputOTP
                  maxLength={6}
                  value={otpCode}
                  onChange={(value) => {
                    setOtpCode(value);
                    if (value.length === 6) {
                      handleVerifyOTP(value);
                    }
                  }}
                  disabled={isPending}
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                  </InputOTPGroup>
                  <InputOTPSeparator />
                  <InputOTPGroup>
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>

                {error && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-sm text-red-600 dark:text-red-400"
                  >
                    {error}
                  </motion.p>
                )}

                {isPending && (
                  <p className="text-sm text-gray-900/50 dark:text-white/50">
                    Verifying...
                  </p>
                )}

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleResend}
                    disabled={countdown > 0 || isPending}
                    className="text-sm text-gray-900/50 transition-colors hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-40 dark:text-white/50 dark:hover:text-white"
                  >
                    {countdown > 0
                      ? `Resend in ${countdown}s`
                      : "Resend Code"}
                  </button>
                </div>
              </div>

              <AlertDialogFooter className="mt-6">
                <AlertDialogCancel className="rounded-full">
                  Cancel
                </AlertDialogCancel>
                <Button
                  onClick={() => handleVerifyOTP(otpCode)}
                  disabled={isPending || otpCode.length !== 6}
                  className="rounded-full bg-red-600 text-white hover:bg-red-700"
                >
                  {isPending ? "Verifying..." : "Confirm Delete"}
                </Button>
              </AlertDialogFooter>
            </motion.div>
          )}
        </AnimatePresence>
      </AlertDialogContent>
    </AlertDialog>
  );
}
