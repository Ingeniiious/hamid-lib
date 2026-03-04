"use client";

import { motion } from "framer-motion";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
  InputOTPSeparator,
} from "@/components/ui/input-otp";

const ease = [0.25, 0.46, 0.45, 0.94] as const;

interface PortalCodeInputProps {
  value: string;
  onChange: (value: string) => void;
  onComplete: (value: string) => void;
  disabled?: boolean;
}

export function PortalCodeInput({
  value,
  onChange,
  onComplete,
  disabled,
}: PortalCodeInputProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, ease }}
      className="flex justify-center"
    >
      <InputOTP
        maxLength={8}
        value={value}
        onChange={(v) => onChange(v.toUpperCase())}
        onComplete={onComplete}
        disabled={disabled}
        inputMode="text"
        pattern="[A-Za-z0-9]*"
      >
        <InputOTPGroup>
          {[0, 1, 2, 3].map((i) => (
            <InputOTPSlot
              key={i}
              index={i}
              className="h-12 w-10 border-white/20 bg-white/10 text-base font-mono font-bold text-white sm:h-14 sm:w-12 sm:text-lg"
            />
          ))}
        </InputOTPGroup>
        <InputOTPSeparator className="text-white/30" />
        <InputOTPGroup>
          {[4, 5, 6, 7].map((i) => (
            <InputOTPSlot
              key={i}
              index={i}
              className="h-12 w-10 border-white/20 bg-white/10 text-base font-mono font-bold text-white sm:h-14 sm:w-12 sm:text-lg"
            />
          ))}
        </InputOTPGroup>
      </InputOTP>
    </motion.div>
  );
}
