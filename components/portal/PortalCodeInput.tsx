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
        <InputOTPGroup>
          {[0, 1, 2, 3].map((i) => (
            <InputOTPSlot
              key={i}
              index={i}
              className="border-white/20 bg-white/10 text-white data-[active=true]:border-white/40 data-[active=true]:ring-white/20"
            />
          ))}
        </InputOTPGroup>
        <InputOTPSeparator className="text-white/20" />
        <InputOTPGroup>
          {[4, 5, 6, 7].map((i) => (
            <InputOTPSlot
              key={i}
              index={i}
              className="border-white/20 bg-white/10 text-white data-[active=true]:border-white/40 data-[active=true]:ring-white/20"
            />
          ))}
        </InputOTPGroup>
      </InputOTP>
    </motion.div>
  );
}
