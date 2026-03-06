"use client";

import { useState } from "react";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { AdminShell } from "@/components/admin/AdminShell";

interface AdminLayoutClientProps {
  children: React.ReactNode;
  userName: string;
  avatarUrl?: string;
  roleName: string;
  permissions: string[];
}

export function AdminLayoutClient({
  children,
  userName,
  avatarUrl,
  roleName,
  permissions,
}: AdminLayoutClientProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="relative h-full w-full">
      {/* Gradient overlay */}
      <div className="pointer-events-none absolute inset-0 z-0 bg-gradient-to-b from-transparent from-0% via-[var(--background)]/60 via-[20%] to-[var(--background)] to-[45%]" />

      {/* Content */}
      <div className="relative z-10 flex h-full">
        {/* Sidebar — persistent */}
        <AdminSidebar
          permissions={permissions}
          mobileOpen={mobileOpen}
          onMobileClose={() => setMobileOpen(false)}
        />

        {/* Main column */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Top bar — persistent */}
          <div className="shrink-0">
            <AdminTopBar
              userName={userName}
              avatarUrl={avatarUrl}
              roleName={roleName}
              onMenuClick={() => setMobileOpen(true)}
            />
          </div>

          {/* Page content — cross-fades between admin routes */}
          <div className="min-h-0 flex-1 overflow-y-auto">
            <AdminShell>{children}</AdminShell>
          </div>
        </div>
      </div>
    </div>
  );
}
