"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  House,
  Users,
  BookOpen,
  Buildings,
  GitPullRequest,
  Star,
  PresentationChart,
  CalendarBlank,
  ChartLine,
  UserGear,
  ClockCounterClockwise,
  Gear,
  CaretLeft,
  EnvelopeSimple,
  BellRinging,
  Brain,
  Headset,
} from "@phosphor-icons/react";
import Image from "next/image";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

const ease = [0.25, 0.46, 0.45, 0.94] as const;

const STORAGE_KEY = "admin-sidebar-collapsed";

interface NavItem {
  icon: typeof House;
  label: string;
  href: string;
  permission: string | null;
}

const navItems: NavItem[] = [
  { icon: House, label: "Overview", href: "/admin", permission: null },
  { icon: Users, label: "Users", href: "/admin/users", permission: "users.view" },
  { icon: BookOpen, label: "Courses", href: "/admin/courses", permission: "courses.view" },
  { icon: Buildings, label: "Faculties", href: "/admin/faculties", permission: "faculties.view" },
  { icon: GitPullRequest, label: "Contributions", href: "/admin/contributions", permission: "contributions.view" },
  { icon: Star, label: "Reviews", href: "/admin/reviews", permission: "contributions.view" },
  { icon: PresentationChart, label: "Presentations", href: "/admin/presentations", permission: "presentations.view" },
  { icon: CalendarBlank, label: "Calendar", href: "/admin/calendar", permission: "calendar.view" },
  { icon: Brain, label: "AI Council", href: "/admin/ai-council", permission: null },
  { icon: ChartLine, label: "Analytics", href: "/admin/analytics", permission: "analytics.view" },
  { icon: BellRinging, label: "Notifications", href: "/admin/notifications", permission: null },
  { icon: Headset, label: "Support", href: "/admin/support", permission: "support.view" },
  { icon: EnvelopeSimple, label: "Email", href: "/admin/email", permission: "email.view" },
  { icon: UserGear, label: "Team", href: "/admin/team", permission: "team.view" },
  { icon: ClockCounterClockwise, label: "Audit Log", href: "/admin/audit-log", permission: "audit.view" },
  { icon: Gear, label: "Settings", href: "/admin/settings", permission: "settings.view" },
];

interface AdminSidebarProps {
  permissions: string[];
  mobileOpen: boolean;
  onMobileClose: () => void;
}

function NavContent({
  collapsed,
  permissions,
  onNavigate,
}: {
  collapsed: boolean;
  permissions: string[];
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  const filteredItems = navItems.filter(
    (item) => item.permission === null || permissions.includes(item.permission)
  );

  const isActive = (href: string) => {
    if (href === "/admin") return pathname === "/admin";
    return pathname.startsWith(href);
  };

  return (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div
        className={cn(
          "flex h-16 shrink-0 items-center border-b px-4",
          "border-gray-900/10 dark:border-white/10"
        )}
      >
        <Link
          href="/admin"
          className="flex items-center gap-3 overflow-hidden"
          onClick={onNavigate}
        >
          <Image
            src="/icon-48.png"
            alt="Libraryyy"
            width={28}
            height={28}
            className="shrink-0 rounded-lg"
          />
          <AnimatePresence mode="wait">
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3, ease: [...ease] }}
                className="font-display whitespace-nowrap text-lg font-light text-gray-900 dark:text-white"
              >
                Libraryyy
              </motion.span>
            )}
          </AnimatePresence>
        </Link>
      </div>

      {/* Nav Items */}
      <ScrollArea className="flex-1">
        <nav className="flex flex-col gap-1 p-3">
          {filteredItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                className={cn(
                  "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  "text-gray-600 hover:bg-gray-900/5 hover:text-gray-900",
                  "dark:text-gray-400 dark:hover:bg-white/10 dark:hover:text-white",
                  active && "bg-gray-900/10 text-gray-900 dark:bg-white/15 dark:text-white",
                  collapsed && "justify-center px-0"
                )}
                title={collapsed ? item.label : undefined}
              >
                <Icon
                  weight="duotone"
                  className={cn(
                    "h-5 w-5 shrink-0 transition-colors",
                    active
                      ? "text-gray-900 dark:text-white"
                      : "text-gray-500 group-hover:text-gray-900 dark:text-gray-400 dark:group-hover:text-white"
                  )}
                />
                <AnimatePresence mode="wait">
                  {!collapsed && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.3, ease: [...ease] }}
                      className="whitespace-nowrap"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </Link>
            );
          })}
        </nav>
      </ScrollArea>

      {/* Collapse Toggle (only shown on desktop, hidden in mobile sheet) */}
      {onNavigate === undefined && (
        <div
          className={cn(
            "shrink-0 border-t p-3",
            "border-gray-900/10 dark:border-white/10"
          )}
        >
          <button
            onClick={() => {
              /* handled by parent */
            }}
            data-collapse-toggle
            className={cn(
              "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              "text-gray-500 hover:bg-gray-900/5 hover:text-gray-900",
              "dark:text-gray-400 dark:hover:bg-white/10 dark:hover:text-white",
              collapsed && "justify-center px-0"
            )}
          >
            <motion.div
              animate={{ rotate: collapsed ? 180 : 0 }}
              transition={{ duration: 0.3, ease: [...ease] }}
            >
              <CaretLeft weight="duotone" className="h-5 w-5 shrink-0" />
            </motion.div>
            <AnimatePresence mode="wait">
              {!collapsed && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3, ease: [...ease] }}
                  className="whitespace-nowrap"
                >
                  Collapse
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </div>
      )}
    </div>
  );
}

export function AdminSidebar({
  permissions,
  mobileOpen,
  onMobileClose,
}: AdminSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "true") setCollapsed(true);
    setMounted(true);
  }, []);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY, String(next));
      return next;
    });
  }, []);

  // Attach click handler to collapse toggle button via event delegation
  const handleSidebarClick = useCallback(
    (e: React.MouseEvent) => {
      const target = e.target as HTMLElement;
      const toggleBtn = target.closest("[data-collapse-toggle]");
      if (toggleBtn) {
        toggleCollapsed();
      }
    },
    [toggleCollapsed]
  );

  if (!mounted) {
    return (
      <aside className="hidden w-64 shrink-0 lg:block" aria-hidden="true" />
    );
  }

  return (
    <>
      {/* Desktop Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: collapsed ? 64 : 256 }}
        transition={{ duration: 0.3, ease: [...ease] }}
        onClick={handleSidebarClick}
        className={cn(
          "fixed inset-y-0 left-0 z-30 hidden flex-col lg:flex",
          "border-r bg-white/50 backdrop-blur-xl",
          "border-gray-900/10",
          "dark:border-white/10 dark:bg-white/5"
        )}
      >
        <NavContent collapsed={collapsed} permissions={permissions} />
      </motion.aside>

      {/* Spacer to offset main content */}
      <motion.div
        initial={false}
        animate={{ width: collapsed ? 64 : 256 }}
        transition={{ duration: 0.3, ease: [...ease] }}
        className="hidden shrink-0 lg:block"
      />

      {/* Mobile Sheet */}
      <Sheet open={mobileOpen} onOpenChange={(open) => !open && onMobileClose()}>
        <SheetContent
          side="left"
          showCloseButton={false}
          className={cn(
            "w-72 p-0",
            "border-r bg-white/50 backdrop-blur-xl",
            "border-gray-900/10",
            "dark:border-white/10 dark:bg-white/5"
          )}
        >
          <NavContent
            collapsed={false}
            permissions={permissions}
            onNavigate={onMobileClose}
          />
        </SheetContent>
      </Sheet>
    </>
  );
}
