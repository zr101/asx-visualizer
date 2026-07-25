/* Generated from schemas/. Do not edit — run npm run types:generate */

export interface ManifestFile {
  files: string[];
  latest_date: string;
  previous_date: string | null;
  session_count: number;
  sessions: string[];
  universe: UniverseCounts;
}
export interface UniverseCounts {
  common_stocks: number;
  funds_and_etfs: number;
  liquid_stocks: number;
  other: number;
  total_listings: number;
}
