"use client";

import { useState, useEffect, useTransition, use } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  CalendarDots,
  PresentationChart,
  SignOut,
  Trash,
} from "@phosphor-icons/react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DestructiveConfirmDialog } from "@/components/admin/DestructiveConfirmDialog";
import {
  getUserDetail,
  banUser,
  unbanUser,
  getUserSessions,
  revokeUserSession,
  revokeAllUserSessions,
} from "../actions";

const ease = [0.25, 0.46, 0.45, 0.94] as const;

interface UserDetail {
  id: string;
  name: string;
  email: string;
  image: string | null;
  banned: boolean;
  banReason: string | null;
  banExpires: string | null;
  emailVerified: boolean;
  createdAt: string;
  university: string;
  gender: string;
  avatarUrl: string | null;
  facultyId: number | null;
  programId: number | null;
  facultyName: string;
  programName: string;
  calendarEventsCount: number;
  presentationsCount: number;
  contributorEmail: string | null;
  contributorUniversity: string | null;
  contributorVerifiedAt: string | null;
}

interface SessionInfo {
  id: string;
  token: string;
  userAgent: string | null;
  ipAddress: string | null;
  createdAt: string;
  expiresAt: string;
}

export default function UserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [user, setUser] = useState<UserDetail | null>(null);
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [notFound, setNotFound] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Ban dialog
  const [banDialogOpen, setBanDialogOpen] = useState(false);
  const [banReason, setBanReason] = useState("");
  const [banDuration, setBanDuration] = useState("permanent");

  // Unban confirm
  const [unbanDialogOpen, setUnbanDialogOpen] = useState(false);

  // Revoke all sessions confirm
  const [revokeAllDialogOpen, setRevokeAllDialogOpen] = useState(false);

  useEffect(() => {
    startTransition(async () => {
      const data = await getUserDetail(id);
      if (!data) {
        setNotFound(true);
        return;
      }
      setUser(data as UserDetail);
    });
  }, [id]);

  const loadSessions = () => {
    startTransition(async () => {
      const data = await getUserSessions(id);
      setSessions(data as SessionInfo[]);
    });
  };

  const handleBan = () => {
    if (!user) return;
    const daysMap: Record<string, number | undefined> = {
      permanent: undefined,
      "1": 1,
      "7": 7,
      "30": 30,
      "90": 90,
    };
    startTransition(async () => {
      await banUser(user.id, banReason || undefined, daysMap[banDuration]);
      setUser({
        ...user,
        banned: true,
        banReason: banReason || null,
        banExpires: daysMap[banDuration]
          ? new Date(
              Date.now() + daysMap[banDuration]! * 24 * 60 * 60 * 1000
            ).toISOString()
          : null,
      });
      setBanDialogOpen(false);
      setBanReason("");
      setBanDuration("permanent");
      setSessions([]);
    });
  };

  const handleUnban = () => {
    if (!user) return;
    startTransition(async () => {
      await unbanUser(user.id);
      setUser({ ...user, banned: false, banReason: null, banExpires: null });
    });
  };

  const handleRevokeSession = (token: string) => {
    startTransition(async () => {
      await revokeUserSession(token);
      setSessions((prev) => prev.filter((s) => s.token !== token));
    });
  };

  const handleRevokeAll = () => {
    if (!user) return;
    startTransition(async () => {
      await revokeAllUserSessions(user.id);
      setSessions([]);
    });
  };

  if (notFound) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 px-6 py-20">
        <p className="text-gray-900/50 dark:text-white/50">User not found.</p>
        <Button
          variant="outline"
          onClick={() => router.push("/admin/users")}
          className="rounded-full border-gray-900/15 bg-white/50 backdrop-blur-xl dark:border-white/15 dark:bg-white/10"
        >
          Back To Users
        </Button>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="space-y-6 px-6 py-6 sm:px-8">
        <Skeleton className="h-6 w-24 rounded-xl bg-gray-900/5 dark:bg-white/5" />
        <Skeleton className="h-64 rounded-2xl bg-gray-900/5 dark:bg-white/5" />
        <Skeleton className="h-32 rounded-2xl bg-gray-900/5 dark:bg-white/5" />
      </div>
    );
  }

  return (
    <div className="space-y-6 px-6 py-6 sm:px-8">
      {/* Back link */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, ease }}
        onClick={() => router.push("/admin/users")}
        className="flex items-center gap-2 text-sm text-gray-900/50 transition-colors hover:text-gray-900 dark:text-white/50 dark:hover:text-white"
      >
        <ArrowLeft size={16} weight="duotone" />
        Back To Users
      </motion.button>

      {/* User card */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, ease, delay: 0.05 }}
        className="rounded-2xl border border-gray-900/10 bg-white/50 p-6 backdrop-blur-xl dark:border-white/15 dark:bg-white/10"
      >
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <Avatar className="h-16 w-16 border border-gray-900/10 dark:border-white/15">
              {(user.avatarUrl || user.image) && (
                <AvatarImage
                  src={user.avatarUrl || user.image || ""}
                  alt={user.name}
                />
              )}
              <AvatarFallback className="bg-gray-900/5 text-lg dark:bg-white/10">
                {user.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h2 className="font-display text-xl font-light text-gray-900 dark:text-white">
                  {user.name}
                </h2>
                {user.banned && (
                  <Badge variant="destructive" className="text-xs">
                    Banned
                  </Badge>
                )}
              </div>
              <p className="text-sm text-gray-900/60 dark:text-white/60">
                {user.email}
              </p>
              {user.emailVerified && (
                <p className="text-xs text-green-600 dark:text-green-400">
                  Email Verified
                </p>
              )}
              {user.banned && user.banReason && (
                <p className="text-xs text-red-600 dark:text-red-400">
                  Reason: {user.banReason}
                </p>
              )}
              {user.banned && user.banExpires && (
                <p className="text-xs text-red-600/70 dark:text-red-400/70">
                  Expires:{" "}
                  {new Date(user.banExpires).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </p>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            {user.banned ? (
              <Button
                variant="outline"
                onClick={() => setUnbanDialogOpen(true)}
                className="rounded-full border-gray-900/15 bg-green-500/10 text-green-700 backdrop-blur-xl hover:bg-green-500/20 dark:border-white/15 dark:text-green-400"
              >
                Unban User
              </Button>
            ) : (
              <Button
                variant="outline"
                onClick={() => setBanDialogOpen(true)}
                className="rounded-full border-gray-900/15 bg-red-500/10 text-red-700 backdrop-blur-xl hover:bg-red-500/20 dark:border-white/15 dark:text-red-400"
              >
                Ban User
              </Button>
            )}
          </div>
        </div>
      </motion.div>

      {/* Tabs */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, ease, delay: 0.1 }}
      >
        <Tabs defaultValue="profile">
          <TabsList className="rounded-full border border-gray-900/10 bg-white/50 p-1 backdrop-blur-xl dark:border-white/15 dark:bg-white/10">
            <TabsTrigger
              value="profile"
              className="rounded-full text-sm data-[state=active]:bg-gray-900 data-[state=active]:text-white dark:data-[state=active]:bg-white dark:data-[state=active]:text-gray-900"
            >
              Profile
            </TabsTrigger>
            <TabsTrigger
              value="activity"
              className="rounded-full text-sm data-[state=active]:bg-gray-900 data-[state=active]:text-white dark:data-[state=active]:bg-white dark:data-[state=active]:text-gray-900"
            >
              Activity
            </TabsTrigger>
            <TabsTrigger
              value="sessions"
              className="rounded-full text-sm data-[state=active]:bg-gray-900 data-[state=active]:text-white dark:data-[state=active]:bg-white dark:data-[state=active]:text-gray-900"
              onClick={loadSessions}
            >
              Sessions
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="mt-4">
            <div className="rounded-2xl border border-gray-900/10 bg-white/50 p-6 backdrop-blur-xl dark:border-white/15 dark:bg-white/10">
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <ProfileField label="University" value={user.university} />
                <ProfileField label="Faculty" value={user.facultyName} />
                <ProfileField label="Program" value={user.programName} />
                <ProfileField
                  label="Gender"
                  value={user.gender}
                  capitalize
                />
                <ProfileField
                  label="Joined"
                  value={new Date(user.createdAt).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                />
                <ProfileField label="User ID" value={user.id} mono />
                {user.contributorEmail && (
                  <ProfileField
                    label="University Email (Contributor)"
                    value={user.contributorEmail}
                  />
                )}
                {user.contributorUniversity && (
                  <ProfileField
                    label="Verified University"
                    value={user.contributorUniversity}
                  />
                )}
                {user.contributorVerifiedAt && (
                  <ProfileField
                    label="Contributor Since"
                    value={new Date(
                      user.contributorVerifiedAt
                    ).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  />
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="activity" className="mt-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex items-center gap-4 rounded-2xl border border-gray-900/10 bg-white/50 p-6 backdrop-blur-xl dark:border-white/15 dark:bg-white/10">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  <CalendarDots size={24} weight="duotone" />
                </div>
                <div>
                  <p className="text-2xl font-light text-gray-900 dark:text-white">
                    {user.calendarEventsCount}
                  </p>
                  <p className="text-sm text-gray-900/50 dark:text-white/50">
                    Calendar Events
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 rounded-2xl border border-gray-900/10 bg-white/50 p-6 backdrop-blur-xl dark:border-white/15 dark:bg-white/10">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
                  <PresentationChart size={24} weight="duotone" />
                </div>
                <div>
                  <p className="text-2xl font-light text-gray-900 dark:text-white">
                    {user.presentationsCount}
                  </p>
                  <p className="text-sm text-gray-900/50 dark:text-white/50">
                    Presentations
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="sessions" className="mt-4 space-y-4">
            {sessions.length > 0 && (
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  onClick={() => setRevokeAllDialogOpen(true)}
                  className="gap-2 rounded-full border-red-500/20 bg-red-500/10 text-red-700 hover:bg-red-500/20 dark:text-red-400"
                  size="sm"
                >
                  <SignOut size={14} weight="duotone" />
                  Revoke All Sessions
                </Button>
              </div>
            )}

            {sessions.length === 0 ? (
              <div className="rounded-2xl border border-gray-900/10 bg-white/50 p-8 text-center backdrop-blur-xl dark:border-white/15 dark:bg-white/10">
                <p className="text-sm text-gray-900/50 dark:text-white/50">
                  No active sessions.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {sessions.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between rounded-2xl border border-gray-900/10 bg-white/50 p-4 backdrop-blur-xl dark:border-white/15 dark:bg-white/10"
                  >
                    <div className="space-y-1">
                      <p className="text-sm text-gray-900 dark:text-white">
                        {s.ipAddress || "Unknown IP"}
                      </p>
                      <p className="max-w-xs truncate text-xs text-gray-900/50 dark:text-white/50">
                        {s.userAgent || "Unknown device"}
                      </p>
                      <p className="text-xs text-gray-900/40 dark:text-white/40">
                        Created{" "}
                        {new Date(s.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                    <button
                      onClick={() => handleRevokeSession(s.token)}
                      disabled={isPending}
                      className="rounded-full p-2 text-gray-900/40 transition-colors hover:bg-red-500/10 hover:text-red-600 dark:text-white/40 dark:hover:text-red-400"
                    >
                      <Trash size={16} weight="duotone" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </motion.div>

      {/* Ban dialog with reason + duration */}
      <Dialog open={banDialogOpen} onOpenChange={setBanDialogOpen}>
        <DialogContent className="rounded-2xl border-gray-900/15 bg-white/90 backdrop-blur-xl dark:border-white/15 dark:bg-gray-900/90">
          <DialogHeader>
            <DialogTitle className="font-display font-light">
              Ban {user.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <p className="text-sm text-gray-900/70 dark:text-white/70">
              This will immediately ban the user and revoke all their active
              sessions. They will be logged out everywhere.
            </p>
            <div className="space-y-2">
              <label className="text-xs text-gray-900/50 dark:text-white/50">
                Reason (optional)
              </label>
              <Textarea
                placeholder="e.g. Spam, policy violation, abuse..."
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs text-gray-900/50 dark:text-white/50">
                Duration
              </label>
              <Select value={banDuration} onValueChange={setBanDuration}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="permanent">Permanent</SelectItem>
                  <SelectItem value="1">1 Day</SelectItem>
                  <SelectItem value="7">7 Days</SelectItem>
                  <SelectItem value="30">30 Days</SelectItem>
                  <SelectItem value="90">90 Days</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => setBanDialogOpen(false)}
                className="rounded-full"
              >
                Cancel
              </Button>
              <Button
                onClick={handleBan}
                disabled={isPending}
                className="rounded-full bg-red-600 text-white hover:bg-red-700"
              >
                {isPending ? "Banning..." : "Confirm Ban"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Unban confirm */}
      <DestructiveConfirmDialog
        open={unbanDialogOpen}
        onOpenChange={setUnbanDialogOpen}
        title={`Unban ${user.name}`}
        description={`This will unban ${user.name} (${user.email}). They will regain access to the platform immediately.`}
        onConfirmed={handleUnban}
      />

      {/* Revoke all sessions confirm */}
      <DestructiveConfirmDialog
        open={revokeAllDialogOpen}
        onOpenChange={setRevokeAllDialogOpen}
        title="Revoke All Sessions"
        description={`This will immediately log out ${user.name} from all devices. They will need to sign in again.`}
        onConfirmed={handleRevokeAll}
      />
    </div>
  );
}

function ProfileField({
  label,
  value,
  capitalize = false,
  mono = false,
}: {
  label: string;
  value: string;
  capitalize?: boolean;
  mono?: boolean;
}) {
  return (
    <div>
      <p className="text-xs text-gray-900/50 dark:text-white/50">{label}</p>
      <p
        className={`mt-0.5 text-sm text-gray-900 dark:text-white ${
          capitalize ? "capitalize" : ""
        } ${mono ? "font-mono text-xs" : ""}`}
      >
        {value || "\u2014"}
      </p>
    </div>
  );
}
