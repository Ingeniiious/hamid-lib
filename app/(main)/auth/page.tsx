"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import Link from "next/link";
import { Eye, EyeSlash, CaretUpDown, Check } from "@phosphor-icons/react";
import { authClient } from "@/lib/auth-client";
import {
  sendOTP,
  verifyOTP,
  saveUserProfile,
  sendPasswordResetOTP,
  resetPasswordWithOTP,
} from "./actions";
import {
  sendAdminOTP,
  verifyAdminOTP,
} from "@/app/(main)/admin/verify/actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
const ease = [0.25, 0.46, 0.45, 0.94] as const;

type Mode =
  | "sign-in"
  | "sign-up"
  | "verify"
  | "forgot-password"
  | "forgot-verify"
  | "forgot-new-password"
  | "admin-verify";

function PasswordInput({
  value,
  onChange,
  autoComplete,
  placeholder = "Password",
  minLength,
  className,
}: {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  autoComplete: string;
  placeholder?: string;
  minLength?: number;
  className?: string;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <Input
        type={visible ? "text" : "password"}
        name="password"
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        required
        minLength={minLength}
        autoComplete={autoComplete}
        className={className}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 transition-colors hover:text-white/70"
        tabIndex={-1}
        aria-label={visible ? "Hide password" : "Show password"}
      >
        {visible ? (
          <EyeSlash size={18} weight="duotone" />
        ) : (
          <Eye size={18} weight="duotone" />
        )}
      </button>
    </div>
  );
}

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(() => {
    // Default to sign-up for new users, sign-in for returning users
    if (typeof window !== "undefined") {
      return localStorage.getItem("hamid-lib-visited") ? "sign-in" : "sign-up";
    }
    return "sign-in";
  });
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resetOtp, setResetOtp] = useState("");
  const [resetSuccess, setResetSuccess] = useState(false);
  const [gender, setGender] = useState("");
  const [genderOpen, setGenderOpen] = useState(false);

  const [adminOtp, setAdminOtp] = useState("");
  const adminOtpSending = useRef(false);

  const redirectByRole = async (user: Record<string, unknown> | undefined) => {
    localStorage.setItem("hamid-lib-visited", "1");
    const isAdmin = user?.role === "admin";
    if (isAdmin) {
      if (adminOtpSending.current) return;
      adminOtpSending.current = true;
      try {
        const result = await sendAdminOTP();
        if (result.error) {
          setError(result.error);
          adminOtpSending.current = false;
          return;
        }
        setMode("admin-verify");
      } catch {
        setError("Failed to send admin verification code.");
        adminOtpSending.current = false;
      }
    } else {
      router.replace("/dashboard");
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { data, error: authError } = await authClient.signIn.email({
        email,
        password,
      });

      if (authError) {
        const msg = (authError.message || "").toLowerCase();
        if (msg.includes("invalid") || msg.includes("credential") || msg.includes("password") || msg.includes("not found") || msg.includes("user")) {
          setError("Invalid email or password.");
        } else {
          setError(authError.message || "Invalid email or password.");
        }
        return;
      }

      redirectByRole(data?.user as Record<string, unknown> | undefined);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message.toLowerCase() : "";
      if (msg.includes("invalid") || msg.includes("credential") || msg.includes("password") || msg.includes("not found") || msg.includes("user")) {
        setError("Invalid email or password.");
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const result = await sendOTP(email);
      if (result.error) {
        setError(result.error);
        return;
      }
      setMode("verify");
    } catch {
      setError("Failed to send verification code.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (code?: string) => {
    const otpValue = code || otp;
    if (otpValue.length !== 6) return;

    setError(null);
    setLoading(true);

    try {
      const result = await verifyOTP(email, otpValue);
      if (result.error) {
        setError(result.error);
        setOtp("");
        return;
      }

      const { data, error: authError } = await authClient.signUp.email({
        name,
        email,
        password,
      });

      if (authError) {
        setError(authError.message || "Failed to create account.");
        return;
      }

      // Save gender profile
      if (gender) {
        await saveUserProfile("", gender);
      }

      redirectByRole(data?.user as Record<string, unknown> | undefined);
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
      const result = await sendOTP(email);
      if (result.error) setError(result.error);
    } catch {
      setError("Failed to resend code.");
    } finally {
      setLoading(false);
    }
  };

  const handleAdminVerify = async (code?: string) => {
    const otpValue = code || adminOtp;
    if (otpValue.length !== 6) return;

    setError(null);
    setLoading(true);

    try {
      const result = await verifyAdminOTP(otpValue);
      if ("error" in result && result.error) {
        setError(result.error);
        setAdminOtp("");
        return;
      }
      router.replace("/admin");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleAdminResend = async () => {
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

  const switchMode = (next: Mode) => {
    setError(null);
    setOtp("");
    setResetOtp("");
    setNewPassword("");
    setConfirmPassword("");
    setResetSuccess(false);
    setMode(next);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const result = await sendPasswordResetOTP(email);
      if (result.error) {
        setError(result.error);
        return;
      }
      setMode("forgot-verify");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotVerifyComplete = (code: string) => {
    if (code.length === 6) {
      setResetOtp(code);
      setError(null);
      setMode("forgot-new-password");
    }
  };

  const handleForgotVerifyButton = () => {
    if (resetOtp.length === 6) {
      setError(null);
      setMode("forgot-new-password");
    }
  };

  const handleResetResend = async () => {
    setError(null);
    setLoading(true);
    try {
      const result = await sendPasswordResetOTP(email);
      if (result.error) setError(result.error);
    } catch {
      setError("Failed to resend code.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);

    try {
      const result = await resetPasswordWithOTP(email, resetOtp, newPassword);
      if (result.error) {
        setError(result.error);
        return;
      }
      setResetSuccess(true);
      setTimeout(() => switchMode("sign-in"), 2000);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    if (mode === "sign-in") return handleSignIn(e);
    if (mode === "forgot-password") return handleForgotPassword(e);
    if (mode === "forgot-new-password") return handleResetPassword(e);
    return handleSignUp(e);
  };

  const inputClass =
    "rounded-full border-white/20 bg-white/10 text-center text-white placeholder:text-white/50 focus-visible:ring-white/30 px-5";

  const passwordInputClass =
    "rounded-full border-white/20 bg-white/10 text-center text-white placeholder:text-white/50 focus-visible:ring-white/30 pl-11 pr-11";

  const isSignUp = mode === "sign-up";
  const isVerify = mode === "verify";
  const isForgot = mode === "forgot-password";
  const isForgotVerify = mode === "forgot-verify";
  const isForgotNewPassword = mode === "forgot-new-password";
  const isAdminVerify = mode === "admin-verify";

  return (
    <div className="flex w-full flex-col items-center justify-center">
      {/* Back To Home — absolutely positioned, completely independent of card */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, ease, delay: 0.2 }}
        className="absolute bottom-8 text-center sm:bottom-10"
      >
        <Link
          href="/"
          className="inline-flex items-center rounded-full bg-white/10 px-8 py-3 text-sm font-medium text-white backdrop-blur-sm transition-all duration-300 hover:bg-white/20"
        >
          Back To Home
        </Link>
      </motion.div>

      {/* Card — single container, smoothly resizes */}
      <div className="w-full max-w-sm px-6">
      <LayoutGroup>
        <motion.div
          layout
          className="overflow-hidden rounded-3xl border border-white/20 bg-white/10 p-8 shadow-2xl backdrop-blur-xl"
          style={{ borderRadius: "1.5rem" }}
          transition={{ layout: { duration: 0.35, ease } }}
        >
          <AnimatePresence mode="wait" initial={false}>
            {isAdminVerify ? (
              /* ── Admin OTP Verification ── */
              <motion.div
                key="admin-verify"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <h2 className="mb-2 text-center font-display text-2xl font-light text-white">
                  Admin Verification
                </h2>
                <p className="mb-6 text-center text-sm text-white/50">
                  Enter the 6-digit code sent to your email
                </p>

                <div className="flex flex-col items-center gap-4">
                  <InputOTP
                    maxLength={6}
                    value={adminOtp}
                    onChange={setAdminOtp}
                    onComplete={handleAdminVerify}
                  >
                    <InputOTPGroup>
                      {[0, 1, 2, 3, 4, 5].map((i) => (
                        <InputOTPSlot
                          key={i}
                          index={i}
                          className="border-white/20 bg-white/10 text-white data-[active=true]:border-white/40 data-[active=true]:ring-white/20"
                        />
                      ))}
                    </InputOTPGroup>
                  </InputOTP>

                  {error && (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-center text-sm text-red-300"
                    >
                      {error}
                    </motion.p>
                  )}

                  <Button
                    onClick={() => handleAdminVerify()}
                    disabled={loading || adminOtp.length !== 6}
                    className="w-full rounded-full bg-white font-medium text-gray-900 hover:bg-white/90 disabled:opacity-50"
                  >
                    {loading ? "Verifying..." : "Verify"}
                  </Button>

                  <button
                    onClick={handleAdminResend}
                    disabled={loading}
                    className="text-sm text-white/70 underline underline-offset-2 transition-colors hover:text-white disabled:opacity-50"
                  >
                    Resend Code
                  </button>
                </div>
              </motion.div>
            ) : isForgotNewPassword ? (
              /* ── New Password (after OTP verified) ── */
              <motion.div
                key="forgot-new-password"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <motion.h2
                  layout
                  className="mb-2 text-center font-display text-2xl font-light text-white"
                  transition={{ layout: { duration: 0.3, ease } }}
                >
                  New Password
                </motion.h2>
                <motion.p
                  layout
                  className="mb-6 text-center text-sm text-white/50"
                  transition={{ layout: { duration: 0.3, ease } }}
                >
                  {resetSuccess
                    ? "Your password has been reset. Redirecting..."
                    : "Enter your new password below."}
                </motion.p>

                {!resetSuccess ? (
                  <form
                    onSubmit={handleFormSubmit}
                    className="flex flex-col items-center gap-4"
                  >
                    <motion.div
                      layout
                      className="w-full"
                      transition={{ layout: { duration: 0.3, ease } }}
                    >
                      <PasswordInput
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="New Password"
                        minLength={8}
                        autoComplete="new-password"
                        className={passwordInputClass}
                      />
                    </motion.div>

                    <motion.div
                      layout
                      className="w-full"
                      transition={{ layout: { duration: 0.3, ease } }}
                    >
                      <PasswordInput
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirm Password"
                        minLength={8}
                        autoComplete="new-password"
                        className={passwordInputClass}
                      />
                    </motion.div>

                    <AnimatePresence>
                      {error && (
                        <motion.p
                          layout
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="text-center text-sm text-red-300"
                        >
                          {error}
                        </motion.p>
                      )}
                    </AnimatePresence>

                    <motion.div
                      layout
                      className="w-full"
                      transition={{ layout: { duration: 0.3, ease } }}
                    >
                      <Button
                        type="submit"
                        disabled={loading}
                        className="w-full rounded-full bg-white font-medium text-gray-900 hover:bg-white/90 disabled:opacity-50"
                      >
                        {loading ? "Resetting..." : "Reset Password"}
                      </Button>
                    </motion.div>
                  </form>
                ) : null}

                {!resetSuccess && (
                  <motion.p
                    layout
                    transition={{ layout: { duration: 0.3, ease } }}
                    className="mt-5 text-center text-sm text-white/70"
                  >
                    <button
                      onClick={() => switchMode("sign-in")}
                      className="text-white underline underline-offset-2 transition-colors hover:text-white"
                    >
                      Back To Sign In
                    </button>
                  </motion.p>
                )}
              </motion.div>
            ) : isForgotVerify ? (
              /* ── Forgot Password — Verify OTP ── */
              <motion.div
                key="forgot-verify"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <h2 className="mb-2 text-center font-display text-2xl font-light text-white">
                  Enter Reset Code
                </h2>
                <p className="mb-6 text-center text-sm text-white/50">
                  Enter the 6-digit code sent to{" "}
                  <span className="text-white/70">{email}</span>
                </p>

                <div className="flex flex-col items-center gap-4">
                  <InputOTP
                    maxLength={6}
                    value={resetOtp}
                    onChange={setResetOtp}
                    onComplete={handleForgotVerifyComplete}
                  >
                    <InputOTPGroup>
                      {[0, 1, 2, 3, 4, 5].map((i) => (
                        <InputOTPSlot
                          key={i}
                          index={i}
                          className="border-white/20 bg-white/10 text-white data-[active=true]:border-white/40 data-[active=true]:ring-white/20"
                        />
                      ))}
                    </InputOTPGroup>
                  </InputOTP>

                  {error && (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-center text-sm text-red-300"
                    >
                      {error}
                    </motion.p>
                  )}

                  <Button
                    onClick={handleForgotVerifyButton}
                    disabled={loading || resetOtp.length !== 6}
                    className="w-full rounded-full bg-white font-medium text-gray-900 hover:bg-white/90 disabled:opacity-50"
                  >
                    Continue
                  </Button>

                  <div className="flex gap-4 text-sm">
                    <button
                      onClick={handleResetResend}
                      disabled={loading}
                      className="text-white/70 underline underline-offset-2 transition-colors hover:text-white disabled:opacity-50"
                    >
                      Resend Code
                    </button>
                    <button
                      onClick={() => switchMode("forgot-password")}
                      className="text-white/70 underline underline-offset-2 transition-colors hover:text-white"
                    >
                      Back
                    </button>
                  </div>
                </div>
              </motion.div>
            ) : isForgot ? (
              /* ── Forgot Password — Enter Email ── */
              <motion.div
                key="forgot-form"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <motion.h2
                  layout
                  className="mb-2 text-center font-display text-2xl font-light text-white"
                  transition={{ layout: { duration: 0.3, ease } }}
                >
                  Reset Password
                </motion.h2>
                <motion.p
                  layout
                  className="mb-6 text-center text-sm text-white/50"
                  transition={{ layout: { duration: 0.3, ease } }}
                >
                  Enter your email to receive a reset code.
                </motion.p>

                <form
                  onSubmit={handleFormSubmit}
                  className="flex flex-col items-center gap-4"
                >
                  <motion.div
                    layout
                    className="w-full"
                    transition={{ layout: { duration: 0.3, ease } }}
                  >
                    <Input
                      type="email"
                      name="email"
                      placeholder="Email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoComplete="email"
                      className={inputClass}
                    />
                  </motion.div>

                  <AnimatePresence>
                    {error && (
                      <motion.p
                        layout
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="text-center text-sm text-red-300"
                      >
                        {error}
                      </motion.p>
                    )}
                  </AnimatePresence>

                  <motion.div
                    layout
                    className="w-full"
                    transition={{ layout: { duration: 0.3, ease } }}
                  >
                    <Button
                      type="submit"
                      disabled={loading}
                      className="w-full rounded-full bg-white font-medium text-gray-900 hover:bg-white/90 disabled:opacity-50"
                    >
                      {loading ? "Sending..." : "Send Reset Code"}
                    </Button>
                  </motion.div>
                </form>

                <motion.p
                  layout
                  transition={{ layout: { duration: 0.3, ease } }}
                  className="mt-5 text-center text-sm text-white/70"
                >
                  <button
                    onClick={() => switchMode("sign-in")}
                    className="text-white underline underline-offset-2 transition-colors hover:text-white"
                  >
                    Back To Sign In
                  </button>
                </motion.p>
              </motion.div>
            ) : !isVerify ? (
              /* ── Sign In / Sign Up (shared form) ── */
              <motion.div
                key="auth-form"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                {/* Title */}
                <motion.h2
                  layout
                  className="mb-6 text-center font-display text-2xl font-light text-white"
                  transition={{ layout: { duration: 0.3, ease } }}
                >
                  {isSignUp ? "Create Account" : "Welcome Back"}
                </motion.h2>

                {/* Form */}
                <form
                  onSubmit={handleFormSubmit}
                  className="flex flex-col gap-4"
                  autoComplete="on"
                >
                  {/* Name field — sign-up only, slides in from top */}
                  <AnimatePresence mode="popLayout">
                    {isSignUp && (
                      <motion.div
                        key="name-field"
                        layout
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.25, ease }}
                      >
                        <Input
                          type="text"
                          name="name"
                          placeholder="Full Name"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          required
                          autoComplete="name"
                          className={inputClass}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Email — always visible, smoothly repositions */}
                  <motion.div
                    layout
                    transition={{ layout: { duration: 0.3, ease } }}
                  >
                    <Input
                      type="email"
                      name="email"
                      placeholder="Email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoComplete="email"
                      className={inputClass}
                    />
                  </motion.div>

                  {/* Password — always visible, smoothly repositions */}
                  <motion.div
                    layout
                    transition={{ layout: { duration: 0.3, ease } }}
                  >
                    <PasswordInput
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete={
                        isSignUp ? "new-password" : "current-password"
                      }
                      minLength={isSignUp ? 8 : undefined}
                      className={passwordInputClass}
                    />
                  </motion.div>

                  {/* Gender — sign-up only */}
                  <AnimatePresence mode="popLayout">
                    {isSignUp && (
                      <motion.div
                        key="gender-field"
                        layout
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.25, ease }}
                      >
                        <Popover open={genderOpen} onOpenChange={setGenderOpen}>
                          <PopoverTrigger asChild>
                            <button
                              type="button"
                              role="combobox"
                              aria-expanded={genderOpen}
                              className="relative flex h-10 w-full items-center justify-center rounded-full border border-white/20 bg-white/10 px-5 text-center text-sm text-white transition-colors hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
                            >
                              <span className={gender ? "text-white" : "text-white/50"}>
                                {gender === "male"
                                  ? "Male"
                                  : gender === "female"
                                    ? "Female"
                                    : gender === "prefer-not-to-say"
                                      ? "Prefer Not To Say"
                                      : "Gender"}
                              </span>
                              <CaretUpDown size={16} weight="duotone" className="absolute right-5 text-white/40" />
                            </button>
                          </PopoverTrigger>
                          <PopoverContent
                            className="w-[--radix-popover-trigger-width] rounded-2xl border-gray-900/15 bg-white/70 p-1 backdrop-blur-xl dark:border-white/20 dark:bg-white/10"
                            sideOffset={4}
                          >
                            {[
                              { value: "male", label: "Male" },
                              { value: "female", label: "Female" },
                              { value: "prefer-not-to-say", label: "Prefer Not To Say" },
                            ].map((opt) => (
                              <button
                                key={opt.value}
                                type="button"
                                onClick={() => {
                                  setGender(opt.value);
                                  setGenderOpen(false);
                                }}
                                className="flex w-full items-center justify-center rounded-lg px-3 py-2 text-sm text-gray-900/80 transition-colors hover:bg-gray-900/5 hover:text-gray-900 dark:text-white/80 dark:hover:bg-white/10 dark:hover:text-white"
                              >
                                {gender === opt.value && (
                                  <Check size={14} className="absolute left-3 text-gray-900 dark:text-white" />
                                )}
                                {opt.label}
                              </button>
                            ))}
                          </PopoverContent>
                        </Popover>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Forgot password link — sign-in only */}
                  {!isSignUp && (
                    <motion.div
                      layout
                      transition={{ layout: { duration: 0.3, ease } }}
                      className="-mt-2 text-center"
                    >
                      <button
                        type="button"
                        onClick={() => switchMode("forgot-password")}
                        className="text-xs text-white/60 transition-colors hover:text-white/90"
                      >
                        Forgot Password?
                      </button>
                    </motion.div>
                  )}

                  {/* Error */}
                  <AnimatePresence>
                    {error && (
                      <motion.p
                        layout
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="text-center text-sm text-red-300"
                      >
                        {error}
                      </motion.p>
                    )}
                  </AnimatePresence>

                  {/* Submit button — smoothly repositions */}
                  <motion.div
                    layout
                    transition={{ layout: { duration: 0.3, ease } }}
                  >
                    <Button
                      type="submit"
                      disabled={loading}
                      className="w-full rounded-full bg-white font-medium text-gray-900 hover:bg-white/90 disabled:opacity-50"
                    >
                      {loading
                        ? isSignUp
                          ? "Sending Code..."
                          : "Signing In..."
                        : isSignUp
                          ? "Continue"
                          : "Sign In"}
                    </Button>
                  </motion.div>

                  {/* Legal agreement */}
                  {isSignUp && (
                    <motion.p
                      layout
                      transition={{ layout: { duration: 0.3, ease } }}
                      className="mt-3 text-center text-xs text-white/70"
                    >
                      By signing up, you agree to our{" "}
                      <a
                        href="/terms"
                        target="_blank"
                        className="text-white underline underline-offset-2 hover:text-white"
                      >
                        Terms Of Service
                      </a>{" "}
                      and{" "}
                      <a
                        href="/privacy"
                        target="_blank"
                        className="text-white underline underline-offset-2 hover:text-white"
                      >
                        Privacy Policy
                      </a>
                      .
                    </motion.p>
                  )}
                </form>

                {/* Toggle link — smoothly repositions */}
                <motion.p
                  layout
                  transition={{ layout: { duration: 0.3, ease } }}
                  className="mt-5 text-center text-sm text-white/70"
                >
                  {isSignUp ? (
                    <>
                      Already have an account?{" "}
                      <button
                        onClick={() => switchMode("sign-in")}
                        className="text-white underline underline-offset-2 transition-colors hover:text-white"
                      >
                        Sign In
                      </button>
                    </>
                  ) : (
                    <>
                      Don&apos;t have an account?{" "}
                      <button
                        onClick={() => switchMode("sign-up")}
                        className="text-white underline underline-offset-2 transition-colors hover:text-white"
                      >
                        Sign Up
                      </button>
                    </>
                  )}
                </motion.p>
              </motion.div>
            ) : (
              /* ── Verify OTP ── */
              <motion.div
                key="verify-form"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <h2 className="mb-2 text-center font-display text-2xl font-light text-white">
                  Verify Email
                </h2>
                <p className="mb-6 text-center text-sm text-white/50">
                  Enter the 6-digit code sent to{" "}
                  <span className="text-white/70">{email}</span>
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
                          className="border-white/20 bg-white/10 text-white data-[active=true]:border-white/40 data-[active=true]:ring-white/20"
                        />
                      ))}
                    </InputOTPGroup>
                  </InputOTP>

                  {error && (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-center text-sm text-red-300"
                    >
                      {error}
                    </motion.p>
                  )}

                  <Button
                    onClick={() => handleVerify()}
                    disabled={loading || otp.length !== 6}
                    className="w-full rounded-full bg-white font-medium text-gray-900 hover:bg-white/90 disabled:opacity-50"
                  >
                    {loading ? "Verifying..." : "Verify & Create Account"}
                  </Button>

                  <div className="flex gap-4 text-sm">
                    <button
                      onClick={handleResend}
                      disabled={loading}
                      className="text-white/70 underline underline-offset-2 transition-colors hover:text-white disabled:opacity-50"
                    >
                      Resend Code
                    </button>
                    <button
                      onClick={() => switchMode("sign-up")}
                      className="text-white/70 underline underline-offset-2 transition-colors hover:text-white"
                    >
                      Back
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </LayoutGroup>
      </div>
    </div>
  );
}
