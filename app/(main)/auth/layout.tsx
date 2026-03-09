import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign In",
  description:
    "Sign in or create your Libraryyy account to access university courses, study resources, and more.",
  openGraph: {
    title: "Sign In | Libraryyy",
    description:
      "Sign in or create your Libraryyy account to access university courses, study resources, and more.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Sign In | Libraryyy",
    description:
      "Sign in or create your Libraryyy account to access university courses, study resources, and more.",
  },
  robots: { index: false },
};

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // If already logged in, skip auth and go straight to dashboard
  const { data: session } = await auth.getSession();
  if (session) redirect("/dashboard");

  return <>{children}</>;
}
