import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Libraryyy — Student Platform",
  description:
    "An open-source, community-driven university course library. Study guides, mock exams, presentations, and original content — free for students.",
};

export default function LandingReactLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen overflow-x-hidden" style={{ background: "rgb(33, 33, 33)" }}>
      {children}
    </div>
  );
}
