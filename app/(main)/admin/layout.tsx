import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { adminUser, adminRole, userProfile } from "@/database/schema";
import { getAvatarUrl } from "@/lib/avatar";
import { AdminLayoutClient } from "./AdminLayoutClient";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session } = await auth.getSession();
  if (!session?.user) redirect("/auth");

  // Check if user is an admin
  const adminRows = await db
    .select({
      roleId: adminUser.roleId,
      roleName: adminRole.name,
      roleSlug: adminRole.slug,
      permissions: adminRole.permissions,
      otpVerifiedAt: adminUser.otpVerifiedAt,
    })
    .from(adminUser)
    .innerJoin(adminRole, eq(adminUser.roleId, adminRole.id))
    .where(eq(adminUser.userId, session.user.id))
    .limit(1);

  if (!adminRows[0]) redirect("/dashboard");

  const admin = adminRows[0];
  const userName = session.user.name || "Admin";

  // Fetch profile for avatar
  const profiles = await db
    .select({ avatarUrl: userProfile.avatarUrl, gender: userProfile.gender })
    .from(userProfile)
    .where(eq(userProfile.userId, session.user.id))
    .limit(1);
  const profile = profiles[0];
  const avatarUrl = getAvatarUrl(profile?.avatarUrl, profile?.gender);

  return (
    <AdminLayoutClient
      userName={userName}
      avatarUrl={avatarUrl}
      roleName={admin.roleName}
      permissions={admin.permissions}
    >
      {children}
    </AdminLayoutClient>
  );
}
