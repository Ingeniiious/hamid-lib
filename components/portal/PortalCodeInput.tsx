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
      transition={{ duration: 0.5, ease, delay: 0.15 }}
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
        autoFocus
      >
        <InputOTPGroup className="gap-1 sm:gap-1.5">
          {[0, 1, 2, 3].map((i) => (
            <InputOTPSlot
              key={i}
              index={i}
              className="h-12 w-10 rounded-lg border border-white/20 bg-white/10 font-mono text-base font-semibold text-white shadow-none placeholder:text-white/20 data-[active=true]:border-white/40 data-[active=true]:ring-[2px] data-[active=true]:ring-white/20 sm:h-14 sm:w-11 sm:text-lg"
            />
          ))}
        </InputOTPGroup>
        <InputOTPSeparator className="mx-1 text-white/20 sm:mx-2" />
        <InputOTPGroup className="gap-1 sm:gap-1.5">
          {[4, 5, 6, 7].map((i) => (
            <InputOTPSlot
              key={i}
              index={i}
              className="h-12 w-10 rounded-lg border border-white/20 bg-white/10 font-mono text-base font-semibold text-white shadow-none placeholder:text-white/20 data-[active=true]:border-white/40 data-[active=true]:ring-[2px] data-[active=true]:ring-white/20 sm:h-14 sm:w-11 sm:text-lg"
            />
          ))}
        </InputOTPGroup>
      </InputOTP>
    </motion.div>
  );
}
