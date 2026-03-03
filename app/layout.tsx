import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { ThemeProvider } from "@/components/ThemeProvider";
import "./globals.css";

const geist = Geist({
  subsets: ["latin", "latin-ext"],
  variable: "--font-geist",
  display: "swap",
});

const siteUrl = "https://library.hamidproject.xyz";

export const metadata: Metadata = {
  title: {
    default: "Hamid Library",
    template: "%s | Hamid Library",
  },
  description:
    "Your University Course Library — courses, presentations, resources, and more.",
  metadataBase: new URL(siteUrl),
  openGraph: {
    title: "Hamid Library",
    description:
      "Your University Course Library — courses, presentations, resources, and more.",
    url: siteUrl,
    siteName: "Hamid Library",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Hamid Library",
    description:
      "Your University Course Library — courses, presentations, resources, and more.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geist.variable} font-sans antialiased`}>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
