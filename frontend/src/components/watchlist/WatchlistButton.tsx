"use client";

import { Star } from "lucide-react";

import { useWatchlist } from "@/hooks/useWatchlist";
import { tickerOf } from "@/lib/format";

export function WatchlistButton({ symbol }: { symbol: string }) {
  const { symbols, toggle } = useWatchlist();
  const saved = symbols.includes(symbol);

  return (
    <button
      type="button"
      onClick={() => toggle(symbol)}
      aria-pressed={saved}
      aria-label={
        saved
          ? `Remove ${tickerOf(symbol)} from watchlist`
          : `Add ${tickerOf(symbol)} to watchlist`
      }
      className="rounded-md p-1.5 text-muted-foreground transition-colors hover:text-foreground"
    >
      <Star
        className="h-4 w-4"
        aria-hidden
        fill={saved ? "currentColor" : "none"}
        style={saved ? { color: "var(--chart-accent)" } : undefined}
      />
    </button>
  );
}
