/* Generated from schemas/. Do not edit — run npm run types:generate */

export interface SectorsFile {
  date: string;
  latest: SectorRow[];
  rotation: RotationRow[];
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
/**
 * A sector's return in each window, with its rank in that window.
 *
 * The ranks drive the shading in the rotation table and were previously
 * undeclared on the frontend, reachable only through an index signature that
 * also made every typo compile.
 */
export interface RotationRow {
  "1d"?: number | null;
  "1d_rank"?: number | null;
  "1m"?: number | null;
  "1m_rank"?: number | null;
  "1w"?: number | null;
  "1w_rank"?: number | null;
  "1y"?: number | null;
  "1y_rank"?: number | null;
  "3m"?: number | null;
  "3m_rank"?: number | null;
  "6m"?: number | null;
  "6m_rank"?: number | null;
  count: number;
  sector: string;
  ytd?: number | null;
  ytd_rank?: number | null;
}
