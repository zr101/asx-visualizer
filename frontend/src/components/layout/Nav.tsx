"use client";

import { Menu, Moon, Search, Sun, X } from "lucide-react";
import { useTheme } from "next-themes";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/", label: "Pulse" },
  { href: "/screener", label: "Screener" },
  { href: "/internals", label: "Internals" },
  { href: "/sectors", label: "Sectors" },
  { href: "/watchlist", label: "Watchlist" },
  { href: "/about", label: "Method" },
];

export function Nav({ onOpenSearch }: { onOpenSearch: () => void }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { resolvedTheme, setTheme } = useTheme();

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-4">
        <Link href="/" className="flex shrink-0 items-center gap-2 font-semibold tracking-tight">
          <span className="grid h-6 w-6 place-items-center rounded bg-chart-accent text-[11px] font-bold text-white">
            A
          </span>
          <span className="hidden sm:inline">ASX Intelligence</span>
        </Link>

        <nav className="hidden flex-1 items-center gap-1 md:flex" aria-label="Main">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={isActive(link.href) ? "page" : undefined}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm transition-colors",
                isActive(link.href)
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            onClick={onOpenSearch}
            className="flex items-center gap-2 rounded-md border border-border px-2.5 py-1.5 text-sm text-muted-foreground hover:text-foreground"
            aria-label="Search stocks"
          >
            <Search className="h-4 w-4" aria-hidden />
            <span className="hidden lg:inline">Search</span>
            <kbd className="hidden rounded border border-border px-1 font-mono text-[10px] lg:inline">
              ⌘K
            </kbd>
          </button>

          <button
            type="button"
            onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
            className="rounded-md p-2 text-muted-foreground hover:text-foreground"
            aria-label="Toggle colour theme"
          >
            {/* Both icons render; CSS shows the right one. The active theme is
                unknown until hydration, and branching on it in JS would either
                mismatch the server markup or need an extra render to correct. */}
            <Sun className="hidden h-4 w-4 dark:block" aria-hidden />
            <Moon className="h-4 w-4 dark:hidden" aria-hidden />
          </button>

          <button
            type="button"
            onClick={() => setMobileOpen((open) => !open)}
            className="rounded-md p-2 text-muted-foreground hover:text-foreground md:hidden"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <nav className="border-t border-border px-4 py-2 md:hidden" aria-label="Main">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "block rounded-md px-3 py-2 text-sm",
                isActive(link.href)
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground",
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
