import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import LandingPage from "@/components/landing/LandingPage";

export default async function Home() {
  // Logged-in users skip the landing page entirely — straight to dashboard.
  // This gives PWA users a native app feel (open app → see dashboard).
  // Next.js 16: getSession() may try to set cookies which throws in Server Components.
  // Wrap in try-catch — if it fails, just show the landing page (user isn't logged in).
  try {
    const { data: session } = await auth.getSession();
    if (session) redirect("/dashboard");
  } catch {
    // Cookie modification not allowed in Server Component — user is not logged in
  }

  return <LandingPage />;
}
