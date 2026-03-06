"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/ThemeToggle";

const Grainient = dynamic(() => import("@/components/Grainient"), {
  ssr: false,
});

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isDashboard = pathname.startsWith("/dashboard");
  const isAdmin = pathname.startsWith("/admin");

  return (
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
      <div className="relative z-10 flex h-full w-full">
        {children}
      </div>

      {/* Theme toggle — top-right, only on non-dashboard/admin pages */}
      {!isDashboard && !isAdmin && (
        <div className="absolute right-6 top-6 z-20 sm:right-8 sm:top-8">
          <ThemeToggle />
        </div>
      )}
    </main>
  );
}
