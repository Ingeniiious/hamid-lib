"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeSlash } from "@phosphor-icons/react";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { AvatarCropModal } from "@/components/AvatarCropModal";
import { getDefaultAvatar } from "@/lib/avatar";
import { UNIVERSITIES } from "@/lib/universities";
import { UniversityPicker } from "@/components/UniversityPicker";
import { FacultyPicker } from "@/components/FacultyPicker";
import { ProgramPicker } from "@/components/ProgramPicker";
import { getFacultiesForUniversity, getProgramsForFaculty } from "@/app/(main)/auth/actions";

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
  "h-10 rounded-full border-gray-900/15 bg-gray-900/5 text-center text-gray-900 placeholder:text-gray-900/40 focus-visible:ring-gray-900/20 dark:border-white/20 dark:bg-white/10 dark:text-white dark:placeholder:text-white/50 dark:focus-visible:ring-white/30 px-5";

const passwordInputClass =
  "h-10 rounded-full border-gray-900/15 bg-gray-900/5 text-center text-gray-900 placeholder:text-gray-900/40 focus-visible:ring-gray-900/20 dark:border-white/20 dark:bg-white/10 dark:text-white dark:placeholder:text-white/50 dark:focus-visible:ring-white/30 pl-11 pr-11";

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
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Faculty & Program
  const [facultyId, setFacultyId] = useState<number | null>(null);
  const [availableFaculties, setAvailableFaculties] = useState<
    { id: number; name: string; slug: string }[]
  >([]);
  const [programId, setProgramId] = useState<number | null>(null);
  const [availablePrograms, setAvailablePrograms] = useState<
    { id: number; name: string; slug: string }[]
  >([]);

  // Avatar
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [hasCustomAvatar, setHasCustomAvatar] = useState(false);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [avatarMsg, setAvatarMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
        setFacultyId(profile.facultyId ?? null);
        setProgramId(profile.programId ?? null);
        if (profile.avatarUrl) {
          setAvatarUrl(profile.avatarUrl);
          setHasCustomAvatar(!!profile.avatarKey);
        } else {
          setAvatarUrl(getDefaultAvatar(profile.gender));
        }
      } else {
        setAvatarUrl(getDefaultAvatar(null));
      }
      setProfileLoaded(true);
    });
  }, [router]);

  // Update avatar preview when gender changes (if no custom avatar)
  useEffect(() => {
    if (!hasCustomAvatar && profileLoaded) {
      setAvatarUrl(getDefaultAvatar(gender || null));
    }
  }, [gender, hasCustomAvatar, profileLoaded]);

  // Load faculties when university changes
  useEffect(() => {
    const uni = university === "__other__" ? "" : university;
    if (!uni) {
      setAvailableFaculties([]);
      setFacultyId(null);
      setAvailablePrograms([]);
      setProgramId(null);
      return;
    }
    let cancelled = false;
    getFacultiesForUniversity(uni).then(({ faculties }) => {
      if (!cancelled) {
        setAvailableFaculties(faculties);
        if (faculties.length === 0) {
          setFacultyId(null);
          setAvailablePrograms([]);
          setProgramId(null);
        } else if (facultyId && !faculties.some((f) => f.id === facultyId)) {
          setFacultyId(null);
          setAvailablePrograms([]);
          setProgramId(null);
        }
      }
    });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [university]);

  // Load programs when faculty changes
  useEffect(() => {
    if (!facultyId) {
      setAvailablePrograms([]);
      setProgramId(null);
      return;
    }
    let cancelled = false;
    getProgramsForFaculty(facultyId).then(({ programs }) => {
      if (!cancelled) {
        setAvailablePrograms(programs);
        // Only clear programId if the new faculty doesn't have it
        if (programId && !programs.some((p) => p.id === programId)) setProgramId(null);
      }
    });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facultyId]);

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

  // Avatar handlers
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setAvatarMsg({ type: "error", text: "File must be under 5MB." });
      return;
    }
    setAvatarMsg(null);
    const reader = new FileReader();
    reader.onload = () => setCropSrc(reader.result as string);
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleCroppedUpload = async (blob: Blob) => {
    setCropSrc(null);
    setAvatarLoading(true);
    setAvatarMsg(null);
    const formData = new FormData();
    formData.append("file", new File([blob], "avatar.png", { type: "image/png" }));

    try {
      const res = await fetch("/api/profile/avatar", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        setAvatarMsg({ type: "error", text: data.error || "Upload failed." });
      } else {
        setAvatarUrl(data.url);
        setHasCustomAvatar(true);
        setAvatarMsg({ type: "success", text: "Avatar updated." });
      }
    } catch {
      setAvatarMsg({ type: "error", text: "Upload failed." });
    }
    setAvatarLoading(false);
  };

  const handleAvatarRemove = async () => {
    setAvatarLoading(true);
    setAvatarMsg(null);
    try {
      const res = await fetch("/api/profile/avatar", { method: "DELETE" });
      if (res.ok) {
        setAvatarUrl(getDefaultAvatar(gender || null));
        setHasCustomAvatar(false);
        setAvatarMsg({ type: "success", text: "Avatar removed." });
      }
    } catch {
      setAvatarMsg({ type: "error", text: "Failed to remove avatar." });
    }
    setAvatarLoading(false);
  };

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
          facultyId,
          programId,
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
      <div className="flex h-full flex-col">
        <div className="mx-auto w-full max-w-5xl shrink-0 px-6">
          <PageHeader title="Account Settings" />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-24">
          <div className="mx-auto max-w-3xl pt-8">
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <div className="h-72 animate-pulse rounded-2xl bg-gray-900/5 dark:bg-white/5" />
              <div className="h-72 animate-pulse rounded-2xl bg-gray-900/5 dark:bg-white/5" />
              <div className="h-48 animate-pulse rounded-2xl bg-gray-900/5 md:col-span-2 dark:bg-white/5" />
              <div className="h-36 animate-pulse rounded-2xl bg-red-500/5 md:col-span-2" />
            </div>
          </div>
        </div>
        <BackButton href="/dashboard" label="Dashboard" floating />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Fixed header — title only */}
      <div className="mx-auto w-full max-w-5xl shrink-0 px-6">
        <PageHeader title="Account Settings" />
      </div>

      {/* Scrollable content */}
      <div
        className="min-h-0 flex-1 overflow-y-auto px-6 pb-24"
        style={{
          maskImage: "linear-gradient(to bottom, transparent 0%, black 64px)",
          WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, black 64px)",
        }}
      >
      <motion.div
        variants={stagger}
        initial="hidden"
        animate="show"
        className="mx-auto max-w-3xl pt-8"
      >
        {/* Bento Grid — 2 cols on desktop, stacked on mobile */}
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {/* ── Profile — full width, 2-col internal layout ── */}
          <motion.div variants={fadeUp} className={`${cardClass} md:col-span-2`}>
            <h2 className="mb-4 text-center font-display text-lg font-light text-gray-900 dark:text-white">
              Profile
            </h2>

            {/* Avatar */}
            <div className="mb-2 flex flex-col items-center gap-3">
              {!profileLoaded ? (
                <Skeleton className="h-20 w-20 rounded-full bg-gray-900/10 dark:bg-white/10" />
              ) : (
                <Avatar className="h-20 w-20 border border-gray-900/20 dark:border-white/20">
                  {avatarUrl && <AvatarImage src={avatarUrl} alt={userName || "Avatar"} />}
                  <AvatarFallback className="bg-gray-900/10 text-xl font-medium text-gray-900 dark:bg-white/10 dark:text-white">
                    {(userName || "S").charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              )}
              <div className="flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  onChange={handleFileSelect}
                />
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="button"
                  disabled={avatarLoading}
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded-xl bg-[#5227FF] px-4 py-2 text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  {avatarLoading ? "Uploading..." : "Upload Photo"}
                </motion.button>
                {hasCustomAvatar && (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="button"
                    disabled={avatarLoading}
                    onClick={handleAvatarRemove}
                    className="rounded-xl border border-gray-900/10 px-4 py-2 text-xs font-medium text-gray-900/70 transition-colors hover:bg-gray-900/5 disabled:opacity-50 dark:border-white/15 dark:text-white/70 dark:hover:bg-white/5"
                  >
                    Remove
                  </motion.button>
                )}
              </div>
              <AnimatePresence>
                {avatarMsg && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className={`text-center text-xs ${
                      avatarMsg.type === "error"
                        ? "text-red-500 dark:text-red-300"
                        : "text-emerald-600 dark:text-emerald-300"
                    }`}
                  >
                    {avatarMsg.text}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>

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
                    {!profileLoaded ? (
                      <Skeleton className="mx-auto h-10 w-full rounded-full bg-gray-900/10 dark:bg-white/10" />
                    ) : (
                    <UniversityPicker
                      value={university}
                      onChange={setUniversity}
                      customValue={customUniversity}
                      onCustomChange={setCustomUniversity}
                      variant="settings"
                      inputClass={inputClass}
                    />
                    )}
                  </div>

                  {availableFaculties.length > 0 && (
                    <div>
                      <label className="mb-1.5 block text-center text-sm text-gray-900/50 dark:text-white/50">
                        Faculty
                      </label>
                      <FacultyPicker
                        faculties={availableFaculties}
                        value={facultyId}
                        onChange={setFacultyId}
                        variant="settings"
                      />
                    </div>
                  )}

                  {availablePrograms.length > 0 && (
                    <div>
                      <label className="mb-1.5 block text-center text-sm text-gray-900/50 dark:text-white/50">
                        Program
                      </label>
                      <ProgramPicker
                        programs={availablePrograms}
                        value={programId}
                        onChange={setProgramId}
                        variant="settings"
                      />
                    </div>
                  )}

                  <div>
                    <label className="mb-1.5 block text-center text-sm text-gray-900/50 dark:text-white/50">
                      Gender
                    </label>
                    {!profileLoaded ? (
                      <div className="flex justify-center gap-2">
                        <Skeleton className="h-9 w-16 rounded-full bg-gray-900/10 dark:bg-white/10" />
                        <Skeleton className="h-9 w-20 rounded-full bg-gray-900/10 dark:bg-white/10" />
                        <Skeleton className="h-9 w-36 rounded-full bg-gray-900/10 dark:bg-white/10" />
                      </div>
                    ) : (
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
                              ? "bg-[#5227FF] text-white"
                              : "bg-gray-900/5 text-gray-900/60 hover:bg-gray-900/10 dark:bg-white/5 dark:text-white/60 dark:hover:bg-white/10"
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                    )}
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
                className="mx-auto w-full max-w-xs rounded-full bg-[#5227FF] font-medium text-white hover:opacity-90 disabled:opacity-50"
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
                className="w-full rounded-full bg-[#5227FF] font-medium text-white hover:opacity-90 disabled:opacity-50"
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
                      ? "bg-[#5227FF] text-white"
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
                          className="border-red-500/20 bg-red-500/5 text-gray-900 data-[active=true]:border-red-500/40 data-[active=true]:ring-red-500/20 dark:text-white"
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
      </motion.div>
      </div>

      {/* Floating back button */}
      <BackButton href="/dashboard" label="Dashboard" floating />

      {/* Crop modal — always rendered so AnimatePresence can fade out */}
      <AvatarCropModal
        imageSrc={cropSrc}
        onCrop={handleCroppedUpload}
        onCancel={() => setCropSrc(null)}
      />
    </div>
  );
}
