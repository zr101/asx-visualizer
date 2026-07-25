/* Generated from schemas/. Do not edit — run npm run types:generate */

export interface SignalsFile {
  counts: {
    [k: string]: number;
  };
  date: string;
  signals: {
    [k: string]: SignalGroup;
  };
  universe_changes?: UniverseChanges | null;
}
export interface SignalGroup {
  label: string;
  rows: SignalRow[];
  total: number;
}
/**
 * A listing that fired a signal.
 *
 * Deliberately not a subclass of Mover: signal rows carry RSI but no
 * `turnover`. The frontend declared exactly that inheritance and it
 * type-checked, because nothing verified the declaration against the payload.
 */
export interface SignalRow {
  RSI: number | null;
  change: number | null;
  close: number | null;
  description: string | null;
  market_cap_basic: number | null;
  name: string | null;
  relative_volume_10d_calc: number | null;
  sector: string | null;
  symbol: string;
  volume: number | null;
}
export interface UniverseChanges {
  delistings: ListingRef[];
  new_listings: ListingRef[];
}
export interface ListingRef {
  close: number | null;
  description: string | null;
  name: string | null;
  sector: string | null;
  symbol: string;
}
