import { TranslatedPageHeader } from "@/components/TranslatedPageHeader";
import { BackButton } from "@/components/BackButton";
import { SupportClient } from "./SupportClient";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Support",
  description: "Get help from the Libraryyy team.",
};

export default function SupportPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-6 pb-24">
      <TranslatedPageHeader titleKey="support.title" subtitleKey="support.subtitle" />
      <SupportClient />
      <BackButton href="/dashboard/me" label="My Studies" floating />
    </div>
  );
}
