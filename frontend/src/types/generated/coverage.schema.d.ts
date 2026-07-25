/* Generated from schemas/. Do not edit — run npm run types:generate */

export interface CoverageFile {
  coverage: FieldCoverage;
  factor_coverage: {
    [k: string]: FactorCoverage;
  };
  generated_from: ArchiveProvenance;
  tickers_complete: number;
  tickers_with_gaps: number;
}
export interface FieldCoverage {
  fields: {
    [k: string]: number;
  };
  rows: number;
  universe: "common_stocks";
}
export interface FactorCoverage {
  inputs: {
    [k: string]: number;
  };
  scored: number;
}
export interface ArchiveProvenance {
  distinct_tickers: number;
  first_session: string;
  latest_session: string;
  sessions: number;
  ticker_days: number;
}
