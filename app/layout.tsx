import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ServiceWorkerProvider } from "@/components/ServiceWorkerProvider";
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
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Libraryyy — Your University Course Library",
        type: "image/jpeg",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Libraryyy",
    description:
      "Your University Course Library — courses, presentations, resources, and more.",
    images: ["/og-image.jpg"],
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
        <ServiceWorkerProvider />
      </body>
    </html>
  );
}
