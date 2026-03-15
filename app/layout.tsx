import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { headers } from "next/headers";
import { Analytics } from "@vercel/analytics/next";
import { ThemeProvider } from "@/components/ThemeProvider";
import { I18nProvider } from "@/lib/i18n";
import { ServiceWorkerProvider } from "@/components/ServiceWorkerProvider";
import { AnalyticsTracker } from "@/components/AnalyticsTracker";
import { CookieConsent } from "@/components/CookieConsent";
import "./globals.css";

const geist = Geist({
  subsets: ["latin", "latin-ext"],
  variable: "--font-geist",
  display: "swap",
});

const siteUrl = "https://libraryyy.com";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

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

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headersList = await headers();
  const geoCountry = headersList.get("x-vercel-ip-country") || "";

  return (
    <html lang="en" data-geo-country={geoCountry} suppressHydrationWarning>
      <body className={`${geist.variable} font-sans antialiased`}>
        <ThemeProvider>
          <I18nProvider>
            {children}
            <AnalyticsTracker />
            <CookieConsent />
          </I18nProvider>
        </ThemeProvider>
        <ServiceWorkerProvider />
        <Analytics />
      </body>
    </html>
  );
}
