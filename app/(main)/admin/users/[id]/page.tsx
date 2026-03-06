"use client";

import { useState, useEffect, useTransition, use } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, CalendarDots, PresentationChart } from "@phosphor-icons/react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { getUserDetail, banUser, unbanUser } from "../actions";

const ease = [0.25, 0.46, 0.45, 0.94] as const;

interface UserDetail {
  id: string;
  name: string;
  email: string;
  image: string | null;
  banned: boolean;
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
}

export default function UserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [user, setUser] = useState<UserDetail | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

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

  const handleBanToggle = () => {
    if (!user) return;
    startTransition(async () => {
      if (user.banned) {
        await unbanUser(user.id);
      } else {
        await banUser(user.id);
      }
      setUser({ ...user, banned: !user.banned });
      setConfirmOpen(false);
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
            </div>
          </div>

          {/* Ban / Unban */}
          <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                className={`rounded-full border-gray-900/15 backdrop-blur-xl dark:border-white/15 ${
                  user.banned
                    ? "bg-green-500/10 text-green-700 hover:bg-green-500/20 dark:text-green-400"
                    : "bg-red-500/10 text-red-700 hover:bg-red-500/20 dark:text-red-400"
                }`}
              >
                {user.banned ? "Unban User" : "Ban User"}
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-2xl border-gray-900/15 bg-white/90 backdrop-blur-xl dark:border-white/15 dark:bg-gray-900/90">
              <DialogHeader>
                <DialogTitle className="font-display font-light">
                  {user.banned ? "Unban User" : "Ban User"}
                </DialogTitle>
              </DialogHeader>
              <p className="text-sm text-gray-900/70 dark:text-white/70">
                {user.banned
                  ? `Are you sure you want to unban ${user.name}? They will regain access to the platform.`
                  : `Are you sure you want to ban ${user.name}? They will lose access to the platform.`}
              </p>
              <div className="flex justify-end gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setConfirmOpen(false)}
                  className="rounded-full"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleBanToggle}
                  disabled={isPending}
                  className={`rounded-full ${
                    user.banned
                      ? "bg-green-600 hover:bg-green-700"
                      : "bg-red-600 hover:bg-red-700"
                  } text-white`}
                >
                  {isPending
                    ? "Processing..."
                    : user.banned
                      ? "Confirm Unban"
                      : "Confirm Ban"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </motion.div>

      {/* Tabs */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, ease, delay: 0.1 }}
      >
        <Tabs defaultValue="profile">
          <TabsList className="rounded-xl border border-gray-900/10 bg-white/50 backdrop-blur-xl dark:border-white/15 dark:bg-white/10">
            <TabsTrigger value="profile" className="rounded-lg text-sm">
              Profile
            </TabsTrigger>
            <TabsTrigger value="activity" className="rounded-lg text-sm">
              Activity
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
        </Tabs>
      </motion.div>
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
