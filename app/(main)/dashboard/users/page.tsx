"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeSlash, CaretUpDown, Check } from "@phosphor-icons/react";
import { authClient } from "@/lib/auth-client";
import {
  updateName,
  changePassword,
  listSessions,
  revokeSession,
  revokeOtherSessions,
  sendDeleteOTP,
  confirmDeleteAccount,
  getUserProfile,
  updateUserProfile,
} from "./actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { BackButton } from "@/components/BackButton";
import { PageHeader } from "@/components/PageHeader";
import { Separator } from "@/components/ui/separator";
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
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { UNIVERSITIES } from "@/lib/universities";

const ease = [0.25, 0.46, 0.45, 0.94] as const;

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease } },
};

const inputClass =
  "rounded-full border-gray-900/15 bg-gray-900/5 text-center text-gray-900 placeholder:text-gray-900/40 focus-visible:ring-gray-900/20 dark:border-white/20 dark:bg-white/10 dark:text-white dark:placeholder:text-white/50 dark:focus-visible:ring-white/30 px-5";

const passwordInputClass =
  "rounded-full border-gray-900/15 bg-gray-900/5 text-center text-gray-900 placeholder:text-gray-900/40 focus-visible:ring-gray-900/20 dark:border-white/20 dark:bg-white/10 dark:text-white dark:placeholder:text-white/50 dark:focus-visible:ring-white/30 pl-11 pr-11";

function PasswordInput({
  value,
  onChange,
  autoComplete,
  placeholder = "Password",
  minLength,
}: {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  autoComplete: string;
  placeholder?: string;
  minLength?: number;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <Input
        type={visible ? "text" : "password"}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        required
        minLength={minLength}
        autoComplete={autoComplete}
        className={passwordInputClass}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-900/30 transition-colors hover:text-gray-900/60 dark:text-white/40 dark:hover:text-white/70"
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

type SessionItem = {
  id: string;
  token: string;
  userAgent?: string | null;
  ipAddress?: string | null;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  expiresAt?: string | Date;
  current?: boolean;
};

function formatDate(d: string | Date | undefined | null) {
  if (!d) return "Unknown";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function parseUA(ua: string | null | undefined) {
  if (!ua) return "Unknown Device";
  if (ua.includes("Chrome")) return "Chrome";
  if (ua.includes("Firefox")) return "Firefox";
  if (ua.includes("Safari")) return "Safari";
  if (ua.includes("Edge")) return "Edge";
  return "Browser";
}

export default function AccountPage() {
  const router = useRouter();

  // Session/user state
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [sessionLoaded, setSessionLoaded] = useState(false);

  // Profile
  const [name, setName] = useState("");
  const [nameLoading, setNameLoading] = useState(false);
  const [nameMsg, setNameMsg] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Password
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwLoading, setPwLoading] = useState(false);
  const [pwMsg, setPwMsg] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Sessions
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [sessionMsg, setSessionMsg] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [revokingAll, setRevokingAll] = useState(false);

  // Delete — 3 steps: idle → password → otp
  const [deleteStep, setDeleteStep] = useState<"idle" | "password" | "otp">(
    "idle"
  );
  const [deletePw, setDeletePw] = useState("");
  const [deleteOtp, setDeleteOtp] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteMsg, setDeleteMsg] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // University & Gender
  const [university, setUniversity] = useState("");
  const [customUniversity, setCustomUniversity] = useState("");
  const [gender, setGender] = useState("");
  const [uniOpen, setUniOpen] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Language
  const [language, setLanguage] = useState("en");

  // Load user session + language preference
  useEffect(() => {
    const saved = localStorage.getItem("hamid-lib-lang");
    if (saved && ["en", "fa", "tr"].includes(saved)) setLanguage(saved);

    authClient.getSession().then(async ({ data }) => {
      if (!data?.user) {
        router.replace("/auth");
        return;
      }
      setUserName(data.user.name || "Student");
      setUserEmail(data.user.email || "");
      setName(data.user.name || "");
      setSessionLoaded(true);

      // Load profile
      const { profile } = await getUserProfile(data.user.id);
      if (profile) {
        const isKnown = UNIVERSITIES.includes(profile.university as typeof UNIVERSITIES[number]);
        if (profile.university && !isKnown) {
          setUniversity("__other__");
          setCustomUniversity(profile.university);
        } else {
          setUniversity(profile.university || "");
        }
        setGender(profile.gender || "");
      }
    });
  }, [router]);

  const handleLanguageChange = (lang: string) => {
    setLanguage(lang);
    localStorage.setItem("hamid-lib-lang", lang);
  };

  // Load sessions
  const loadSessions = useCallback(async () => {
    setSessionsLoading(true);
    const result = await listSessions();
    setSessions((result.sessions as SessionItem[]) || []);
    setSessionsLoading(false);
  }, []);

  useEffect(() => {
    if (sessionLoaded) loadSessions();
  }, [sessionLoaded, loadSessions]);

  // Handlers
  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setNameMsg(null);
    setProfileMsg(null);
    setNameLoading(true);

    const [nameResult, profileResult] = await Promise.all([
      updateName(name),
      (async () => {
        const { data: session } = await authClient.getSession();
        if (!session?.user) return { error: "Not authenticated." };
        const finalUniversity = university === "__other__" ? customUniversity : university;
        return updateUserProfile(session.user.id, {
          university: finalUniversity,
          gender,
        });
      })(),
    ]);

    setNameLoading(false);

    if (nameResult.error) {
      setNameMsg({ type: "error", text: nameResult.error });
    } else if (profileResult.error) {
      setProfileMsg({ type: "error", text: profileResult.error });
    } else {
      setNameMsg({ type: "success", text: "Profile saved." });
      setUserName(name.trim());
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwMsg(null);

    if (newPw !== confirmPw) {
      setPwMsg({ type: "error", text: "Passwords do not match." });
      return;
    }
    if (newPw.length < 8) {
      setPwMsg({
        type: "error",
        text: "Password must be at least 8 characters.",
      });
      return;
    }

    setPwLoading(true);
    const result = await changePassword(currentPw, newPw);
    setPwLoading(false);

    if (result.error) {
      setPwMsg({ type: "error", text: result.error });
    } else {
      setPwMsg({ type: "success", text: "Password changed." });
      setCurrentPw("");
      setNewPw("");
      setConfirmPw("");
    }
  };

  const handleRevokeSession = async (token: string, id: string) => {
    setSessionMsg(null);
    setRevokingId(id);
    const result = await revokeSession(token);
    setRevokingId(null);
    if (result.error) {
      setSessionMsg({ type: "error", text: result.error });
    } else {
      setSessions((prev) => prev.filter((s) => s.id !== id));
      setSessionMsg({ type: "success", text: "Session revoked." });
    }
  };

  const handleRevokeAll = async () => {
    setSessionMsg(null);
    setRevokingAll(true);
    const result = await revokeOtherSessions();
    setRevokingAll(false);
    if (result.error) {
      setSessionMsg({ type: "error", text: result.error });
    } else {
      setSessions((prev) => prev.filter((s) => s.current));
      setSessionMsg({
        type: "success",
        text: "All other sessions revoked.",
      });
    }
  };

  const handleDeletePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setDeleteMsg(null);
    setDeleteLoading(true);
    const result = await sendDeleteOTP(deletePw);
    setDeleteLoading(false);

    if (result.error) {
      setDeleteMsg({ type: "error", text: result.error });
    } else {
      setDeleteStep("otp");
      setDeleteMsg(null);
    }
  };

  const handleDeleteOtp = async (code?: string) => {
    const otpValue = code || deleteOtp;
    if (otpValue.length !== 6) return;

    setDeleteMsg(null);
    setDeleteLoading(true);
    const result = await confirmDeleteAccount(otpValue);
    setDeleteLoading(false);

    if (result.error) {
      setDeleteMsg({ type: "error", text: result.error });
      setDeleteOtp("");
    } else {
      router.replace("/auth");
    }
  };

  const cardClass =
    "rounded-2xl border border-gray-900/10 bg-white/50 p-6 backdrop-blur-xl dark:border-white/15 dark:bg-white/5";

  if (!sessionLoaded) {
    return (
      <div className="mx-auto max-w-5xl px-6 pb-12 pt-4">
        <div className="mx-auto max-w-3xl">
          <div className="mb-8 flex justify-center">
            <div className="h-7 w-48 animate-pulse rounded-lg bg-gray-900/10 dark:bg-white/10" />
          </div>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div className="h-72 animate-pulse rounded-2xl bg-gray-900/5 dark:bg-white/5" />
            <div className="h-72 animate-pulse rounded-2xl bg-gray-900/5 dark:bg-white/5" />
            <div className="h-48 animate-pulse rounded-2xl bg-gray-900/5 md:col-span-2 dark:bg-white/5" />
            <div className="h-36 animate-pulse rounded-2xl bg-red-500/5 md:col-span-2" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
        variants={stagger}
        initial="hidden"
        animate="show"
        className="mx-auto max-w-5xl px-6 pb-12"
      >
        <BackButton href="/dashboard" label="Dashboard" />

        <PageHeader title="Account Settings" />

        <div className="mx-auto max-w-3xl">
        {/* Bento Grid — 2 cols on desktop, stacked on mobile */}
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {/* ── Profile — full width, 2-col internal layout ── */}
          <motion.div variants={fadeUp} className={`${cardClass} md:col-span-2`}>
            <h2 className="mb-4 text-center font-display text-lg font-light text-gray-900 dark:text-white">
              Profile
            </h2>
            <form onSubmit={handleUpdateName} className="flex flex-col gap-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {/* Left column — Name & Email */}
                <div className="flex flex-col gap-4">
                  <div>
                    <label className="mb-1.5 block text-center text-sm text-gray-900/50 dark:text-white/50">
                      Display Name
                    </label>
                    <Input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your Name"
                      required
                      autoComplete="name"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-center text-sm text-gray-900/50 dark:text-white/50">
                      Email
                    </label>
                    <Input
                      type="email"
                      value={userEmail}
                      readOnly
                      className={`${inputClass} cursor-not-allowed opacity-50`}
                    />
                  </div>
                </div>

                {/* Right column — University & Gender */}
                <div className="flex flex-col gap-4">
                  <div>
                    <label className="mb-1.5 block text-center text-sm text-gray-900/50 dark:text-white/50">
                      University
                    </label>
                    <Popover open={uniOpen} onOpenChange={setUniOpen}>
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          role="combobox"
                          aria-expanded={uniOpen}
                          className="flex h-10 w-full items-center justify-between rounded-full border border-gray-900/15 bg-gray-900/5 px-5 text-sm text-gray-900 transition-colors hover:bg-gray-900/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/20 dark:border-white/20 dark:bg-white/10 dark:text-white dark:hover:bg-white/15 dark:focus-visible:ring-white/30"
                        >
                          <span className={university ? "text-gray-900 dark:text-white" : "text-gray-900/40 dark:text-white/50"}>
                            {university === "__other__"
                              ? "Other"
                              : university || "Select University"}
                          </span>
                          <CaretUpDown size={16} weight="duotone" className="text-gray-900/30 dark:text-white/40" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent
                        className="w-[--radix-popover-trigger-width] border-gray-200 bg-white p-0 dark:border-white/20 dark:bg-gray-900/95 dark:backdrop-blur-xl"
                        sideOffset={4}
                      >
                        <Command className="bg-transparent">
                          <CommandInput
                            placeholder="Search university..."
                            className="text-gray-900 placeholder:text-gray-900/40 dark:text-white dark:placeholder:text-white/40"
                          />
                          <CommandList className="max-h-[240px]">
                            <CommandEmpty className="py-3 text-center text-sm text-gray-900/40 dark:text-white/40">
                              No university found.
                            </CommandEmpty>
                            <CommandGroup>
                              {UNIVERSITIES.map((uni) => (
                                <CommandItem
                                  key={uni}
                                  value={uni}
                                  onSelect={() => {
                                    setUniversity(uni);
                                    setCustomUniversity("");
                                    setUniOpen(false);
                                  }}
                                  className="text-gray-900/80 aria-selected:bg-gray-900/5 aria-selected:text-gray-900 dark:text-white/80 dark:aria-selected:bg-white/10 dark:aria-selected:text-white"
                                >
                                  {university === uni && (
                                    <Check size={14} className="mr-2 text-gray-900 dark:text-white" />
                                  )}
                                  {uni}
                                </CommandItem>
                              ))}
                              <CommandItem
                                value="Other — Type Your University"
                                onSelect={() => {
                                  setUniversity("__other__");
                                  setUniOpen(false);
                                }}
                                className="text-gray-900/80 aria-selected:bg-gray-900/5 aria-selected:text-gray-900 dark:text-white/80 dark:aria-selected:bg-white/10 dark:aria-selected:text-white"
                              >
                                {university === "__other__" && (
                                  <Check size={14} className="mr-2 text-gray-900 dark:text-white" />
                                )}
                                Other — Type Your University
                              </CommandItem>
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* Custom university input */}
                  <AnimatePresence>
                    {university === "__other__" && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                      >
                        <Input
                          type="text"
                          placeholder="Your University Name"
                          value={customUniversity}
                          onChange={(e) => setCustomUniversity(e.target.value)}
                          className={inputClass}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div>
                    <label className="mb-1.5 block text-center text-sm text-gray-900/50 dark:text-white/50">
                      Gender
                    </label>
                    <div className="flex justify-center gap-2">
                      {[
                        { value: "male", label: "Male" },
                        { value: "female", label: "Female" },
                        { value: "prefer-not-to-say", label: "Prefer Not To Say" },
                      ].map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setGender(opt.value)}
                          className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${
                            gender === opt.value
                              ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900"
                              : "bg-gray-900/5 text-gray-900/60 hover:bg-gray-900/10 dark:bg-white/5 dark:text-white/60 dark:hover:bg-white/10"
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <AnimatePresence>
                {(nameMsg || profileMsg) && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className={`text-center text-sm ${
                      (nameMsg?.type || profileMsg?.type) === "error"
                        ? "text-red-500 dark:text-red-300"
                        : "text-emerald-600 dark:text-emerald-300"
                    }`}
                  >
                    {nameMsg?.text || profileMsg?.text}
                  </motion.p>
                )}
              </AnimatePresence>
              <Button
                type="submit"
                disabled={nameLoading || profileLoading || !name.trim()}
                className="mx-auto w-full max-w-xs rounded-full bg-gray-900 font-medium text-white hover:bg-gray-800 disabled:opacity-50 dark:bg-white dark:text-gray-900 dark:hover:bg-white/90"
              >
                {nameLoading || profileLoading ? "Saving..." : "Save"}
              </Button>
            </form>
          </motion.div>

          {/* ── Change Password ── */}
          <motion.div variants={fadeUp} className={cardClass}>
            <h2 className="mb-4 text-center font-display text-lg font-light text-gray-900 dark:text-white">
              Change Password
            </h2>
            <form
              onSubmit={handleChangePassword}
              className="mx-auto flex max-w-sm flex-col gap-4"
            >
              <PasswordInput
                value={currentPw}
                onChange={(e) => setCurrentPw(e.target.value)}
                placeholder="Current Password"
                autoComplete="current-password"
              />
              <PasswordInput
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                placeholder="New Password"
                minLength={8}
                autoComplete="new-password"
              />
              <PasswordInput
                value={confirmPw}
                onChange={(e) => setConfirmPw(e.target.value)}
                placeholder="Confirm New Password"
                minLength={8}
                autoComplete="new-password"
              />
              <AnimatePresence>
                {pwMsg && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className={`text-sm ${pwMsg.type === "error" ? "text-red-500 dark:text-red-300" : "text-emerald-600 dark:text-emerald-300"}`}
                  >
                    {pwMsg.text}
                  </motion.p>
                )}
              </AnimatePresence>
              <Button
                type="submit"
                disabled={pwLoading}
                className="w-full rounded-full bg-gray-900 font-medium text-white hover:bg-gray-800 disabled:opacity-50 dark:bg-white dark:text-gray-900 dark:hover:bg-white/90"
              >
                {pwLoading ? "Updating..." : "Update Password"}
              </Button>
            </form>
          </motion.div>

          {/* ── Language Preference ── */}
          <motion.div
            variants={fadeUp}
            className={`${cardClass} flex flex-col`}
          >
            <h2 className="mb-4 text-center font-display text-lg font-light text-gray-900 dark:text-white">
              Language
            </h2>
            <div className="flex flex-1 flex-col justify-center gap-2.5">
              {[
                { code: "en", label: "English" },
                { code: "tr", label: "Türkçe" },
                { code: "fa", label: "پارسی" },
              ].map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => handleLanguageChange(lang.code)}
                  className={`w-full rounded-full px-5 py-2.5 text-sm font-medium transition-all ${
                    language === lang.code
                      ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900"
                      : "bg-gray-900/5 text-gray-900/60 hover:bg-gray-900/10 dark:bg-white/5 dark:text-white/60 dark:hover:bg-white/10"
                  }`}
                >
                  {lang.label}
                </button>
              ))}
            </div>
          </motion.div>

          {/* ── Active Sessions — full width ── */}
          <motion.div
            variants={fadeUp}
            className={`${cardClass} md:col-span-2`}
          >
            <h2 className="mb-4 text-center font-display text-lg font-light text-gray-900 dark:text-white">
              Active Sessions
            </h2>
            {sessions.length > 1 && (
              <div className="mb-4 flex justify-center">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRevokeAll}
                  disabled={revokingAll}
                  className="rounded-full text-xs text-gray-900/50 hover:bg-gray-900/5 hover:text-gray-900 dark:text-white/50 dark:hover:bg-white/10 dark:hover:text-white"
                >
                  {revokingAll ? "Revoking..." : "Sign Out All Others"}
                </Button>
              </div>
            )}

            {sessionsLoading ? (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {[1, 2].map((i) => (
                  <div
                    key={i}
                    className="h-16 animate-pulse rounded-xl bg-gray-900/5 dark:bg-white/5"
                  />
                ))}
              </div>
            ) : sessions.length === 0 ? (
              <p className="text-sm text-gray-900/40 dark:text-white/40">
                No active sessions found.
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {sessions.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between rounded-xl bg-gray-900/5 px-4 py-3 dark:bg-white/5"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {parseUA(s.userAgent)}
                        {s.current && (
                          <span className="ml-2 text-xs text-emerald-600 dark:text-emerald-300">
                            Current
                          </span>
                        )}
                      </p>
                      <p className="truncate text-xs text-gray-900/40 dark:text-white/40">
                        {s.ipAddress || "Unknown IP"} &middot;{" "}
                        {formatDate(s.updatedAt || s.createdAt)}
                      </p>
                    </div>
                    {!s.current && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRevokeSession(s.token, s.id)}
                        disabled={revokingId === s.id}
                        className="ml-3 shrink-0 rounded-full text-xs text-gray-900/50 hover:bg-gray-900/5 hover:text-gray-900 dark:text-white/50 dark:hover:bg-white/10 dark:hover:text-white"
                      >
                        {revokingId === s.id ? "..." : "Sign Out"}
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}

            <AnimatePresence>
              {sessionMsg && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className={`mt-3 text-sm ${sessionMsg.type === "error" ? "text-red-500 dark:text-red-300" : "text-emerald-600 dark:text-emerald-300"}`}
                >
                  {sessionMsg.text}
                </motion.p>
              )}
            </AnimatePresence>
          </motion.div>

          {/* ── Delete Account — full width, danger zone ── */}
          <motion.div
            variants={fadeUp}
            className="rounded-2xl border border-red-500/30 bg-red-500/5 p-6 backdrop-blur-xl md:col-span-2"
          >
            <h2 className="mb-2 text-center font-display text-lg font-light text-gray-900 dark:text-white">
              Delete Account
            </h2>
            <p className="mb-4 text-center text-sm text-gray-900/40 dark:text-white/40">
              This will permanently disable your account. You won&apos;t be able
              to sign in again.
            </p>

            <AnimatePresence mode="wait">
              {deleteStep === "idle" && (
                <motion.div
                  key="delete-idle"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex justify-center"
                >
                  <Button
                    variant="ghost"
                    onClick={() => setDeleteStep("password")}
                    className="rounded-full border border-red-500/30 text-red-600 hover:bg-red-500/10 hover:text-red-500 dark:text-red-300 dark:hover:text-red-200"
                  >
                    Delete Account
                  </Button>
                </motion.div>
              )}

              {deleteStep === "password" && (
                <motion.form
                  key="delete-password"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onSubmit={handleDeletePassword}
                  className="mx-auto flex max-w-sm flex-col gap-4"
                >
                  <Separator className="bg-red-500/20" />
                  <p className="text-center text-sm text-gray-900/50 dark:text-white/50">
                    Enter your password to continue.
                  </p>
                  <PasswordInput
                    value={deletePw}
                    onChange={(e) => setDeletePw(e.target.value)}
                    placeholder="Your Password"
                    autoComplete="current-password"
                  />
                  <AnimatePresence>
                    {deleteMsg && (
                      <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="text-center text-sm text-red-500 dark:text-red-300"
                      >
                        {deleteMsg.text}
                      </motion.p>
                    )}
                  </AnimatePresence>
                  <div className="flex gap-3">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        setDeleteStep("idle");
                        setDeletePw("");
                        setDeleteMsg(null);
                      }}
                      className="flex-1 rounded-full text-gray-900/50 hover:bg-gray-900/5 hover:text-gray-900 dark:text-white/50 dark:hover:bg-white/10 dark:hover:text-white"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={deleteLoading || !deletePw}
                      className="flex-1 rounded-full bg-red-500 font-medium text-white hover:bg-red-600 disabled:opacity-50"
                    >
                      {deleteLoading ? "Sending Code..." : "Continue"}
                    </Button>
                  </div>
                </motion.form>
              )}

              {deleteStep === "otp" && (
                <motion.div
                  key="delete-otp"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="mx-auto flex max-w-sm flex-col items-center gap-4"
                >
                  <Separator className="w-full bg-red-500/20" />
                  <p className="text-center text-sm text-gray-900/50 dark:text-white/50">
                    Enter the 6-digit code sent to your email.
                  </p>
                  <InputOTP
                    maxLength={6}
                    value={deleteOtp}
                    onChange={setDeleteOtp}
                    onComplete={handleDeleteOtp}
                  >
                    <InputOTPGroup>
                      {[0, 1, 2, 3, 4, 5].map((i) => (
                        <InputOTPSlot
                          key={i}
                          index={i}
                          className="border-red-500/20 bg-red-500/5 text-gray-900 dark:text-white"
                        />
                      ))}
                    </InputOTPGroup>
                  </InputOTP>
                  <AnimatePresence>
                    {deleteMsg && (
                      <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="text-center text-sm text-red-500 dark:text-red-300"
                      >
                        {deleteMsg.text}
                      </motion.p>
                    )}
                  </AnimatePresence>
                  <div className="flex w-full gap-3">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        setDeleteStep("idle");
                        setDeletePw("");
                        setDeleteOtp("");
                        setDeleteMsg(null);
                      }}
                      className="flex-1 rounded-full text-gray-900/50 hover:bg-gray-900/5 hover:text-gray-900 dark:text-white/50 dark:hover:bg-white/10 dark:hover:text-white"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={() => handleDeleteOtp()}
                      disabled={deleteLoading || deleteOtp.length !== 6}
                      className="flex-1 rounded-full bg-red-500 font-medium text-white hover:bg-red-600 disabled:opacity-50"
                    >
                      {deleteLoading ? "Deleting..." : "Delete Account"}
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
        </div>
      </motion.div>
  );
}
