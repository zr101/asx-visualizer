import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { AppShell } from "@/components/layout/AppShell";
import { getSearchIndex } from "@/lib/data";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "ASX Market Intelligence",
    template: "%s · ASX Market Intelligence",
  },
  description:
    "Daily breadth, sector rotation and signals across every ASX-listed company, "
    + "built on a point-in-time archive of the whole market.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Read once in the layout and shared with every route, so the search palette
  // works everywhere without each page loading its own copy.
  const searchEntries = await getSearchIndex();

  return (
    // suppressHydrationWarning: next-themes writes the theme class onto <html>
    // before React hydrates, so server and client markup differ here by design.
    <html lang="en-AU" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-screen bg-background font-sans text-foreground antialiased`}
      >
        <AppShell searchEntries={searchEntries}>{children}</AppShell>
      </body>
    </html>
  );
}
