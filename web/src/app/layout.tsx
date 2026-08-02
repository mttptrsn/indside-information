import type { Metadata, Viewport } from "next";
import {
  Cormorant_Garamond,
  Geist,
  Geist_Mono,
} from "next/font/google";
import type { ReactNode } from "react";
import { AppShell } from "@/components/shell/app-shell";
import { ThemeProvider } from "@/components/shell/theme-provider";
import { loadSearchItems } from "@/lib/data/home";
import "./globals.css";

const sans = Geist({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const mono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

const display = Cormorant_Garamond({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
  weight: ["400", "500", "600"],
});

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  "https://example.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Inside Information",
    template: "%s · Inside Information",
  },
  description:
    "Public insider buying disclosures, organized into evidence hidden in plain sight.",
  applicationName: "Inside Information",
  authors: [
    {
      name: "Inside Information",
    },
  ],
  creator: "Inside Information",
  publisher: "Inside Information",
  category: "Finance",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Inside Information",
    description:
      "Public filings transformed into a prioritized view of executive buying, coordination, and behavioral change.",
    type: "website",
    siteName: "Inside Information",
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: "Inside Information",
    description:
      "Not secret. Just hidden in plain sight.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  colorScheme: "light dark",
  themeColor: [
    {
      media: "(prefers-color-scheme: light)",
      color: "#f2efe8",
    },
    {
      media: "(prefers-color-scheme: dark)",
      color: "#10100f",
    },
  ],
};

export default async function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  const searchItems = await loadSearchItems().catch(
    () => [],
  );

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${sans.variable} ${mono.variable} ${display.variable}`}
    >
      <body>
        <ThemeProvider>
          <AppShell searchItems={searchItems}>
            {children}
          </AppShell>
        </ThemeProvider>
      </body>
    </html>
  );
}
