import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { ThemeProvider } from "@/components/ThemeProvider";
import "./globals.css";

const geist = Geist({
  subsets: ["latin", "latin-ext"],
  variable: "--font-geist",
  display: "swap",
});

const siteUrl = "https://libraryyy.com";

export const metadata: Metadata = {
  title: {
    default: "Libraryyy",
    template: "%s | Libraryyy",
  },
  description:
    "Your University Course Library — courses, presentations, resources, and more.",
  metadataBase: new URL(siteUrl),
  openGraph: {
    title: "Libraryyy",
    description:
      "Your University Course Library — courses, presentations, resources, and more.",
    url: siteUrl,
    siteName: "Libraryyy",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Libraryyy",
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
