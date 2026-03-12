import { TermsContent } from "@/components/TermsContent";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms Of Service",
  description:
    "Read the terms of service for Libraryyy, the community-driven university course library.",
  openGraph: {
    title: "Terms Of Service | Libraryyy",
    description:
      "Read the terms of service for Libraryyy, the community-driven university course library.",
  },
  twitter: {
    card: "summary",
    title: "Terms Of Service | Libraryyy",
    description:
      "Read the terms of service for Libraryyy, the community-driven university course library.",
  },
};

export default function TermsPage() {
  return <TermsContent />;
}
