"use client";

import React from "react";
import { useRouter, usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { List } from "@phosphor-icons/react";
import { authClient } from "@/lib/auth-client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/ThemeToggle";
import Link from "next/link";

const ease = [0.25, 0.46, 0.45, 0.94] as const;

interface AdminTopBarProps {
  userName: string;
  avatarUrl?: string;
  roleName: string;
  onMenuClick: () => void;
}

function toTitleCase(str: string): string {
  return str
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function AdminTopBar({
  userName,
  avatarUrl,
  roleName,
  onMenuClick,
}: AdminTopBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const initial = userName.charAt(0).toUpperCase();

  const handleSignOut = async () => {
    await authClient.signOut();
    router.replace("/auth");
  };

  // Build breadcrumb segments from pathname
  // e.g. /admin/users/some-page → ["admin", "users", "some-page"]
  const segments = pathname.split("/").filter(Boolean);
  // segments[0] should be "admin"

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6, ease }}
      className="flex items-center justify-between px-6 py-4 sm:px-8"
    >
      {/* Left — mobile hamburger / desktop breadcrumb */}
      <div className="flex items-center gap-3">
        {/* Mobile hamburger */}
        <button
          onClick={onMenuClick}
          className="flex items-center justify-center rounded-lg p-1.5 text-gray-900 transition-colors hover:bg-gray-900/5 focus-visible:outline-none dark:text-white dark:hover:bg-white/10 lg:hidden"
          aria-label="Open menu"
        >
          <List size={24} weight="duotone" />
        </button>

        {/* Desktop breadcrumb */}
        <Breadcrumb className="hidden lg:flex">
          <BreadcrumbList className="text-white/50">
            {segments.map((segment, index) => {
              const href = "/" + segments.slice(0, index + 1).join("/");
              const isLast = index === segments.length - 1;
              const label =
                index === 0 ? "Admin" : toTitleCase(segment);

              return (
                <React.Fragment key={href}>
                  {index > 0 && <BreadcrumbSeparator className="text-white/30" />}
                  <BreadcrumbItem>
                    {isLast ? (
                      <BreadcrumbPage className="text-white">{label}</BreadcrumbPage>
                    ) : (
                      <BreadcrumbLink asChild className="text-white/50 hover:text-white">
                        <Link href={href}>{label}</Link>
                      </BreadcrumbLink>
                    )}
                  </BreadcrumbItem>
                </React.Fragment>
              );
            })}
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      {/* Right — role badge + avatar dropdown + theme toggle */}
      <div className="flex items-center gap-3">
        <Badge
          variant="outline"
          className="border-white/20 bg-white/10 text-gray-900 dark:text-white"
        >
          {roleName}
        </Badge>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="focus-visible:outline-none" suppressHydrationWarning>
              <Avatar className="h-8 w-8 cursor-pointer border border-gray-900/20 bg-gray-900/10 transition-colors hover:bg-gray-900/20 dark:border-white/20 dark:bg-white/10 dark:hover:bg-white/20">
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
            align="end"
            className="min-w-[160px] rounded-xl border-gray-900/15 bg-white/70 backdrop-blur-xl dark:border-white/20 dark:bg-white/10"
          >
            <DropdownMenuItem
              onClick={() => router.push("/dashboard")}
              className="cursor-pointer rounded-lg text-gray-900/80 focus:bg-gray-900/5 focus:text-gray-900 dark:text-white/80 dark:focus:bg-white/10 dark:focus:text-white"
            >
              Back To Dashboard
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

        <ThemeToggle />
      </div>
    </motion.div>
  );
}
