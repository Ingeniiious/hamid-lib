"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { sendAdminOTP, verifyAdminOTP } from "./actions";

const ease = [0.25, 0.46, 0.45, 0.94] as const;

export default function AdminVerifyPage() {
  const router = useRouter();
  const [otp, setOtp] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const sendingRef = useRef(false);

  useEffect(() => {
    if (!sent && !sendingRef.current) {
      sendingRef.current = true;
      setSent(true);
      sendAdminOTP();
    }
  }, [sent]);

  const handleVerify = async (code?: string) => {
    const otpValue = code || otp;
    if (otpValue.length !== 6) return;

    setError(null);
    setLoading(true);

    try {
      const result = await verifyAdminOTP(otpValue);
      if ("error" in result && result.error) {
        setError(result.error);
        setOtp("");
        return;
      }
      router.replace("/admin");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError(null);
    setLoading(true);
    try {
      const result = await sendAdminOTP();
      if (result.error) setError(result.error);
    } catch {
      setError("Failed to resend code.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-full w-full items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, ease }}
        className="w-full max-w-sm rounded-3xl border border-gray-900/10 bg-white/50 p-8 shadow-2xl backdrop-blur-xl dark:border-white/15 dark:bg-white/10"
      >
        <h2 className="mb-2 text-center font-display text-2xl font-light text-gray-900 dark:text-white">
          Admin Verification
        </h2>
        <p className="mb-6 text-center text-sm text-gray-900/50 dark:text-white/50">
          Enter the 6-digit code sent to your email
        </p>

        <div className="flex flex-col items-center gap-4">
          <InputOTP
            maxLength={6}
            value={otp}
            onChange={setOtp}
            onComplete={handleVerify}
          >
            <InputOTPGroup>
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <InputOTPSlot
                  key={i}
                  index={i}
                  className="border-gray-900/20 bg-gray-900/5 text-gray-900 data-[active=true]:border-gray-900/40 data-[active=true]:ring-gray-900/20 dark:border-white/20 dark:bg-white/10 dark:text-white dark:data-[active=true]:border-white/40 dark:data-[active=true]:ring-white/20"
                />
              ))}
            </InputOTPGroup>
          </InputOTP>

          {error && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center text-sm text-red-600 dark:text-red-400"
            >
              {error}
            </motion.p>
          )}

          <Button
            onClick={() => handleVerify()}
            disabled={loading || otp.length !== 6}
            className="w-full rounded-full bg-gray-900 font-medium text-white hover:bg-gray-900/90 disabled:opacity-50 dark:bg-white dark:text-gray-900 dark:hover:bg-white/90"
          >
            {loading ? "Verifying..." : "Verify"}
          </Button>

          <button
            onClick={handleResend}
            disabled={loading}
            className="text-sm text-gray-900/70 underline underline-offset-2 transition-colors hover:text-gray-900 disabled:opacity-50 dark:text-white/70 dark:hover:text-white"
          >
            Resend Code
          </button>
        </div>
      </motion.div>
    </div>
  );
}
