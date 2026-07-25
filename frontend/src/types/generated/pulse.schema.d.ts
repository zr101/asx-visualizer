/* Generated from schemas/. Do not edit — run npm run types:generate */

export interface PulseFile {
  breadth: BreadthReading;
  date: string;
  gainers: Mover[];
  indices: IndexQuote[];
  losers: Mover[];
  most_active: Mover[];
  previous_date: string | null;
  sectors: SectorRow[];
  signal_counts: {
    [k: string]: number;
  };
  universe: UniverseCounts;
  unusual_volume: Mover[];
}
/**
 * Breadth for one Session, over its Stocks universe.
 */
export interface BreadthReading {
  advance_decline_net: number;
  advance_decline_ratio: number | null;
  advancers: number;
  advancing_pct: number | null;
  decliners: number;
  down_volume: number;
  mean_change: number | null;
  median_change: number | null;
  net_new_highs: number;
  new_highs_52w: number;
  new_lows_52w: number;
  pct_above_sma200: number | null;
  pct_above_sma50: number | null;
  traded_pct: number | null;
  trin: number | null;
  unchanged: number;
  universe_size: number;
  untraded: number;
  up_down_volume_ratio: number | null;
  up_volume: number;
}
export interface Mover {
  change: number | null;
  close: number | null;
  description: string | null;
  market_cap_basic: number | null;
  name: string | null;
  relative_volume_10d_calc: number | null;
  sector: string | null;
  symbol: string;
  turnover: number | null;
  volume: number | null;
}
export interface IndexQuote {
  Perf_1M: number | null;
  Perf_3M: number | null;
  Perf_6M: number | null;
  Perf_W: number | null;
  Perf_Y: number | null;
  Perf_YTD: number | null;
  change: number | null;
  close: number | null;
  description: string | null;
  symbol: string;
}
/**
 * One sector's aggregates for a Session.
 *
 * `traded_count` is the denominator behind `advancing_pct`, stated rather than
 * implied - the two Readings that report participation used to disagree
 * because one counted untraded listings and the other did not.
 */
export interface SectorRow {
  advancers: number;
  advancing_pct: number | null;
  cap_weighted_1d?: number | null;
  cap_weighted_1m?: number | null;
  cap_weighted_1w?: number | null;
  cap_weighted_1y?: number | null;
  cap_weighted_3m?: number | null;
  cap_weighted_6m?: number | null;
  cap_weighted_ytd?: number | null;
  count: number;
  decliners: number;
  equal_weighted_1d?: number | null;
  equal_weighted_1m?: number | null;
  equal_weighted_1w?: number | null;
  equal_weighted_1y?: number | null;
  equal_weighted_3m?: number | null;
  equal_weighted_6m?: number | null;
  equal_weighted_ytd?: number | null;
  market_cap: number;
  market_cap_weight: number | null;
  pct_above_sma200: number | null;
  sector: string;
  traded_count: number;
  turnover: number;
}
export interface UniverseCounts {
  common_stocks: number;
  funds_and_etfs: number;
  liquid_stocks: number;
  other: number;
  total_listings: number;
}
