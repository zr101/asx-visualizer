"use client";

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { tickerOf } from "@/lib/format";
import type { SearchEntry } from "@/types/data";

const MAX_RESULTS = 12;

/**
 * Rank matches by how a person searching a stock actually thinks.
 *
 * Deliberately not fuzzy matching. For ~2,000 tickers, a fuzzy scorer ranks
 * "Bhagwan Marine" above "BHP Group" for the query "BHP", because it matches
 * more characters. Exact ticker first, then ticker prefix, then company name is
 * both faster and correctly ordered.
 */
function score(entry: SearchEntry, query: string): number {
  const ticker = tickerOf(entry[0]).toLowerCase();
  const name = (entry[2] || "").toLowerCase();

  if (ticker === query) return 0;
  if (ticker.startsWith(query)) return 1;
  if (name.startsWith(query)) return 2;
  if (ticker.includes(query)) return 3;
  if (name.includes(query)) return 4;
  return Infinity;
}

/** Rendered only while open, so each session starts with fresh state. */
export function SearchPalette({
  onClose,
  entries,
}: {
  onClose: () => void;
  entries: SearchEntry[];
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return entries.slice(0, MAX_RESULTS);

    const scored: Array<{ entry: SearchEntry; rank: number }> = [];
    for (const entry of entries) {
      const rank = score(entry, needle);
      // The index arrives sorted by market cap, so a stable sort on rank alone
      // already tie-breaks toward the larger, more likely-intended company.
      if (rank !== Infinity) scored.push({ entry, rank });
    }
    return scored
      .sort((a, b) => a.rank - b.rank)
      .slice(0, MAX_RESULTS)
      .map((s) => s.entry);
  }, [entries, query]);

  // Derived during render rather than reset in an effect: a shorter result list
  // must never leave the cursor pointing past the end.
  const activeIndex = Math.min(cursor, Math.max(results.length - 1, 0));

  const go = (entry: SearchEntry) => {
    onClose();
    router.push(`/stock/${tickerOf(entry[0])}`);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 p-4 pt-[10vh]"
      role="dialog"
      aria-modal="true"
      aria-label="Search stocks"
      onClick={onClose}
    >
      <div
        className="mx-auto max-w-lg overflow-hidden rounded-xl border border-border bg-popover shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-border px-3">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape") onClose();
              if (event.key === "ArrowDown") {
                event.preventDefault();
                setCursor((c) => Math.min(c + 1, results.length - 1));
              }
              if (event.key === "ArrowUp") {
                event.preventDefault();
                setCursor((c) => Math.max(c - 1, 0));
              }
              if (event.key === "Enter" && results[activeIndex]) go(results[activeIndex]);
            }}
            placeholder="Search ticker or company…"
            className="h-12 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            aria-label="Search ticker or company"
          />
        </div>

        <ul className="max-h-80 overflow-y-auto p-1">
          {results.length === 0 && (
            <li className="px-3 py-6 text-center text-sm text-muted-foreground">
              No matches for “{query}”.
            </li>
          )}
          {results.map((entry, index) => (
            <li key={entry[0]}>
              <button
                type="button"
                onClick={() => go(entry)}
                onMouseEnter={() => setCursor(index)}
                className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm ${
                  index === activeIndex ? "bg-accent text-accent-foreground" : ""
                }`}
              >
                <span className="w-14 shrink-0 font-mono font-medium">
                  {tickerOf(entry[0])}
                </span>
                <span className="truncate">{entry[2]}</span>
                <span className="ml-auto hidden shrink-0 text-xs text-muted-foreground sm:inline">
                  {entry[3]}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
