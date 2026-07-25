/* Generated from schemas/. Do not edit — run npm run types:generate */

/**
 * One unpacked screener row.
 *
 * The wire format is columnar, so this shape never appears in the JSON - but
 * it is what the frontend reconstructs, and it is the only screener type the
 * UI actually programs against. Declaring it here keeps `SCREENER_FIELDS` and
 * the frontend row type from drifting; a test asserts the two agree.
 */
export interface ScreenerRow {
  ADX: number | null;
  ATR: number | null;
  Perf_1M: number | null;
  Perf_3M: number | null;
  Perf_6M: number | null;
  Perf_W: number | null;
  Perf_Y: number | null;
  Perf_YTD: number | null;
  RSI: number | null;
  Recommend_All: number | null;
  SMA20: number | null;
  SMA200: number | null;
  SMA50: number | null;
  VWAP: number | null;
  Volatility_D: number | null;
  atr_pct: number | null;
  average_volume_30d_calc: number | null;
  beta_1_year: number | null;
  book_yield: number | null;
  change: number | null;
  close: number | null;
  description: string | null;
  dividend_yield_recent: number | null;
  earnings_per_share_basic_ttm: number | null;
  earnings_yield: number | null;
  income_score: number | null;
  industry: string | null;
  is_profitable: boolean | null;
  market_cap_basic: number | null;
  momentum_score: number | null;
  name: string | null;
  pct_from_52w_high: number | null;
  pct_vs_sma200: number | null;
  pct_vs_sma50: number | null;
  price_52_week_high: number | null;
  price_52_week_low: number | null;
  price_book_ratio: number | null;
  price_earnings_ttm: number | null;
  range_position_52w: number | null;
  relative_volume_10d_calc: number | null;
  rs_rating: number | null;
  sector: string | null;
  symbol: string;
  total_revenue_ttm: number | null;
  trend_score: number | null;
  turnover: number | null;
  value_score: number | null;
  volatility_score: number | null;
  volume: number | null;
}
