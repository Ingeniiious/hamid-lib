import { PrivacyContent } from "@/components/PrivacyContent";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "Learn how Libraryyy collects, uses, and protects your personal information. Read our full privacy policy.",
  openGraph: {
    title: "Privacy Policy | Libraryyy",
    description:
      "Learn how Libraryyy collects, uses, and protects your personal information.",
  },
  twitter: {
    card: "summary",
    title: "Privacy Policy | Libraryyy",
    description:
      "Learn how Libraryyy collects, uses, and protects your personal information.",
  },
};

export default function PrivacyPage() {
  return <PrivacyContent />;
}
