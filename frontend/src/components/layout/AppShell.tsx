"use client";

import { ThemeProvider } from "next-themes";
import { useEffect, useState } from "react";

import { Nav } from "@/components/layout/Nav";
import { SearchPalette } from "@/components/layout/SearchPalette";
import type { SearchEntry } from "@/types/data";

export function AppShell({
  children,
  searchEntries,
}: {
  children: React.ReactNode;
  searchEntries: SearchEntry[];
}) {
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "k") {
        event.preventDefault();
        setSearchOpen((open) => !open);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      <Nav onOpenSearch={() => setSearchOpen(true)} />
      <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
      {searchOpen && (
        <SearchPalette onClose={() => setSearchOpen(false)} entries={searchEntries} />
      )}
      <footer className="mt-12 border-t border-border py-6">
        <div className="mx-auto max-w-7xl px-4 text-xs text-muted-foreground">
          <p>
            Market data via TradingView&apos;s public scanner endpoint. Prices are
            unadjusted for corporate actions. For information only — not financial advice.
          </p>
          <p className="mt-1">
            Built by Zaeem Rizan ·{" "}
            <a href="/about" className="underline hover:text-foreground">
              methodology &amp; data quality
            </a>
          </p>
        </div>
      </footer>
    </ThemeProvider>
  );
}
