/**
 * The published data contract.
 *
 * Every shape here is generated from `python/src/contracts/payloads.py` via
 * JSON Schema - see `schemas/`. Do not hand-edit the generated files; run
 * `npm run types:generate` after changing the Python models. CI fails if they
 * are stale.
 *
 * Hand-written types below are the ones with no wire representation: the
 * build-time price series, and the search index (a bare tuple array, kept that
 * way because it is the payload the command palette loads lazily).
 */
export type { BreadthFile } from "./generated/breadth.schema";
export type { CoverageFile } from "./generated/coverage.schema";
export type { ManifestFile as Manifest, UniverseCounts } from "./generated/manifest.schema";
export type {
  BreadthReading as Breadth,
  IndexQuote,
  Mover,
  PulseFile as Pulse,
} from "./generated/pulse.schema";
export type { ScreenerFile } from "./generated/screener.schema";
export type {
  RotationRow,
  SectorRow,
  SectorsFile,
} from "./generated/sectors.schema";
export type {
  SignalGroup,
  SignalRow,
  SignalsFile,
} from "./generated/signals.schema";
export type { ScreenerRow } from "./generated/screener_row.schema";

import type { BreadthFile } from "./generated/breadth.schema";
import type { BreadthReading } from "./generated/pulse.schema";

/** The columnar envelope shared by the row-heavy payloads. */
export type Columnar = Pick<BreadthFile, "n" | "fields" | "columns">;


/** One row of the breadth series: the reading plus its cumulative measures. */
export interface BreadthPoint extends BreadthReading {
  date: string;
  ad_line: number;
  net_new_highs_line: number;
  market_return: number | null;
  market_index: number;
  pct_above_sma200_ma10: number | null;
  advancing_pct_ma10: number | null;
}

/** [symbol, ticker, company name, sector] */
export type SearchEntry = [string, string, string, string | null];

/** Per-ticker price history, read at build time only - never served. */
export interface SeriesFile {
  sessions: string[];
  series: Record<string, { i: number[]; c: Array<number | null>; v: Array<number | null> }>;
}

export const SIGNAL_TONE: Record<string, "positive" | "negative" | "neutral"> = {
  golden_cross: "positive",
  death_cross: "negative",
  new_52w_high: "positive",
  new_52w_low: "negative",
  crossed_above_sma200: "positive",
  crossed_below_sma200: "negative",
  rsi_oversold: "negative",
  rsi_overbought: "positive",
  rsi_exit_oversold: "positive",
  rsi_exit_overbought: "negative",
  macd_bullish_cross: "positive",
  macd_bearish_cross: "negative",
  unusual_volume: "neutral",
  gap_up: "positive",
  gap_down: "negative",
};
