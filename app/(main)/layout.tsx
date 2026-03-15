"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LanguagePicker } from "@/components/LanguagePicker";
import {
  FloatingBackButtonProvider,
  FloatingBackButtonSlot,
} from "@/components/FloatingBackButton";
import { useTranslation } from "@/lib/i18n";

const Grainient = dynamic(() => import("@/components/Grainient"), {
  ssr: false,
});

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { t } = useTranslation();
  const pathname = usePathname();
  const isDashboard = pathname.startsWith("/dashboard");
  const isAdmin = pathname.startsWith("/admin");
  const isLanding = pathname === "/" || pathname === "";
  const isPublicPage = !isDashboard && !isAdmin && !isLanding;

  return (
    <FloatingBackButtonProvider>
      <main className="relative h-dvh w-full overflow-hidden">
        {/* Persistent background — never re-renders across page navigations */}
        <div className="absolute inset-0">
          <Grainient
            color1="#FF9FFC"
            color2="#5227FF"
            color3="#B19EEF"
            grainAmount={0.08}
            timeSpeed={0.15}
            contrast={1.3}
            className="h-full w-full"
          />
        </div>

        {/* Dark mode overlay — dims the Grainient with a smooth transition */}
        <div className="pointer-events-none absolute inset-0 bg-black/0 transition-colors duration-500 dark:bg-black/60" />

        {/* Content */}
        <div className="relative z-10 h-full w-full overflow-hidden">
          {children}
        </div>

        {/* Log In link — top-left, public pages only */}
        {isPublicPage && (
          <Link
            href="/auth"
            className="absolute left-6 top-6 z-20 rounded-full px-4 py-1.5 text-sm font-medium text-gray-900/70 transition-colors hover:text-gray-900 dark:text-white/70 dark:hover:text-white sm:left-8 sm:top-8"
          >
            {t("common.logIn")}
          </Link>
        )}

        {/* Language picker + Theme toggle — top-right, only on non-dashboard/admin pages */}
        {!isDashboard && !isAdmin && (
          <div className="absolute right-6 top-6 z-20 flex items-center gap-1 sm:right-8 sm:top-8">
            {!isLanding && <LanguagePicker />}
            <ThemeToggle />
          </div>
        )}

        {/* Floating back button — persists outside page transitions */}
        <FloatingBackButtonSlot />
      </main>
    </FloatingBackButtonProvider>
  );
}
