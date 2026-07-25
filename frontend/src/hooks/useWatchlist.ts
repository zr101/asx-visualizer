"use client";

import { useCallback, useSyncExternalStore } from "react";

const STORAGE_KEY = "asxv:watchlist:v1";

/**
 * Watchlist backed by localStorage, shared across every mounted component.
 *
 * useSyncExternalStore rather than useState, so starring a stock in the table
 * updates the star on the detail page too without threading context through the
 * tree. getServerSnapshot returns a stable empty array - localStorage does not
 * exist during server rendering, and returning a fresh [] each call would loop.
 */
const EMPTY: string[] = [];
let cache: string[] = EMPTY;
const listeners = new Set<() => void>();

function read(): string[] {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as string[]) : EMPTY;
  } catch {
    return EMPTY;
  }
}

function emit() {
  // Re-read once per change and hand every subscriber the same array identity,
  // so useSyncExternalStore doesn't see a new snapshot on every render.
  cache = read();
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  if (listeners.size === 0) {
    cache = read();
    window.addEventListener("storage", emit);
  }
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) window.removeEventListener("storage", emit);
  };
}

const getSnapshot = () => cache;
const getServerSnapshot = () => EMPTY;

export function useWatchlist() {
  const symbols = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const toggle = useCallback((symbol: string) => {
    const current = read();
    const next = current.includes(symbol)
      ? current.filter((entry) => entry !== symbol)
      : [...current, symbol];
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    emit();
  }, []);

  return { symbols, toggle };
}
