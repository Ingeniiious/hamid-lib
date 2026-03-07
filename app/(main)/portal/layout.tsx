import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Portal",
  description:
    "Access shared course presentations and files through your portal code.",
  openGraph: {
    title: "Portal | Libraryyy",
    description:
      "Access shared course presentations and files through your portal code.",
  },
  twitter: {
    card: "summary",
    title: "Portal | Libraryyy",
    description:
      "Access shared course presentations and files through your portal code.",
  },
  robots: { index: false },
};

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
