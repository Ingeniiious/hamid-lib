"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { authClient } from "@/lib/auth-client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ThemeToggle } from "@/components/ThemeToggle";

const ease = [0.25, 0.46, 0.45, 0.94] as const;

export function DashboardTopBar({
  userName,
  avatarUrl,
  isContributor,
}: {
  userName: string;
  avatarUrl?: string;
  isContributor?: boolean;
}) {
  const router = useRouter();
  const initial = userName.charAt(0).toUpperCase();

  const handleSignOut = async () => {
    await authClient.signOut();
    router.replace("/auth");
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6, ease }}
      className="pointer-events-none flex items-center justify-between px-6 py-5 sm:px-8"
    >
      {/* Left — avatar dropdown + greeting */}
      <div className="pointer-events-auto flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="focus-visible:outline-none">
              <Avatar className="h-9 w-9 cursor-pointer border border-gray-900/20 bg-gray-900/10 transition-colors hover:bg-gray-900/20 dark:border-white/20 dark:bg-white/10 dark:hover:bg-white/20">
                {avatarUrl && (
                  <AvatarImage src={avatarUrl} alt={userName} />
                )}
                <AvatarFallback className="bg-transparent text-sm font-medium text-gray-900 dark:text-white">
                  {initial}
                </AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            className="min-w-[160px] rounded-xl border-gray-900/15 bg-white/70 backdrop-blur-xl dark:border-white/20 dark:bg-white/10"
          >
            <DropdownMenuItem
              onClick={() => router.push("/dashboard")}
              className="cursor-pointer rounded-lg text-gray-900/80 focus:bg-gray-900/5 focus:text-gray-900 dark:text-white/80 dark:focus:bg-white/10 dark:focus:text-white"
            >
              Home
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => router.push("/dashboard/courses")}
              className="cursor-pointer rounded-lg text-gray-900/80 focus:bg-gray-900/5 focus:text-gray-900 dark:text-white/80 dark:focus:bg-white/10 dark:focus:text-white"
            >
              Courses
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => router.push("/dashboard/me/calendar")}
              className="cursor-pointer rounded-lg text-gray-900/80 focus:bg-gray-900/5 focus:text-gray-900 dark:text-white/80 dark:focus:bg-white/10 dark:focus:text-white"
            >
              Calendar
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => router.push("/dashboard/me/presentations")}
              className="cursor-pointer rounded-lg text-gray-900/80 focus:bg-gray-900/5 focus:text-gray-900 dark:text-white/80 dark:focus:bg-white/10 dark:focus:text-white"
            >
              Presentations
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => router.push("/dashboard/space")}
              className="cursor-pointer rounded-lg text-gray-900/80 focus:bg-gray-900/5 focus:text-gray-900 dark:text-white/80 dark:focus:bg-white/10 dark:focus:text-white"
            >
              My Space
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-gray-900/10 dark:bg-white/10" />
            <DropdownMenuItem
              onClick={() => router.push("/dashboard/users")}
              className="cursor-pointer rounded-lg text-gray-900/80 focus:bg-gray-900/5 focus:text-gray-900 dark:text-white/80 dark:focus:bg-white/10 dark:focus:text-white"
            >
              Settings
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => router.push("/dashboard/subs")}
              className="cursor-pointer rounded-lg text-gray-900/80 focus:bg-gray-900/5 focus:text-gray-900 dark:text-white/80 dark:focus:bg-white/10 dark:focus:text-white"
            >
              Subscription
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-gray-900/10 dark:bg-white/10" />
            <DropdownMenuItem
              onClick={handleSignOut}
              className="cursor-pointer rounded-lg text-gray-900/80 focus:bg-gray-900/5 focus:text-gray-900 dark:text-white/80 dark:focus:bg-white/10 dark:focus:text-white"
            >
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <span className="font-display text-sm font-light text-gray-900 dark:text-white">
          Hello, {userName.split(" ")[0]}
        </span>
        {isContributor && (
          <motion.img
            src="https://lib.thevibecodedcompany.com/images/verified-badge.webp"
            alt="Verified Contributor"
            className="h-5 w-5 object-contain"
            whileHover={{ scale: 1.1 }}
            transition={{ duration: 0.2, ease }}
          />
        )}
      </div>

      {/* Right — theme toggle */}
      <div className="pointer-events-auto flex items-center">
        <ThemeToggle />
      </div>
    </motion.div>
  );
}
