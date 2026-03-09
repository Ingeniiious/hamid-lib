import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import LandingPage from "@/components/landing/LandingPage";

export default async function Home() {
  // Logged-in users skip the landing page entirely — straight to dashboard.
  // This gives PWA users a native app feel (open app → see dashboard).
  const { data: session } = await auth.getSession();
  if (session) redirect("/dashboard");

  return <LandingPage />;
}
