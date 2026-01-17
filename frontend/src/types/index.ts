/**
 * Stock data interface matching TradingView Scanner API response
 * Fields correspond to ALL_COLUMNS in python/src/scrapers/tradingview.py
 * Note: All keys use underscores instead of dots to avoid TanStack Table nested key issues
 */
export interface Stock {
  // Symbol identifier (e.g., "ASX:CBA")
  symbol: string;

  // Basic Info
  name: string;
  description: string;
  logoid: string | null;
  exchange: string;
  type: string;
  typespecs: string[];

  // Price Data
  close: number | null;
  open: number | null;
  high: number | null;
  low: number | null;
  volume: number | null;
  change: number | null;      // Change percentage
  change_abs: number | null;  // Absolute change

  // Performance (percentages)
  Perf_W: number | null;    // Weekly
  Perf_1M: number | null;   // 1 Month
  Perf_3M: number | null;   // 3 Month
  Perf_6M: number | null;   // 6 Month
  Perf_Y: number | null;    // 1 Year
  Perf_YTD: number | null;  // Year to Date
  Perf_5Y: number | null;   // 5 Year
  Perf_All: number | null;  // All Time

  // Price Extremes
  High_1M: number | null;   // 1 Month High
  Low_1M: number | null;    // 1 Month Low
  High_3M: number | null;   // 3 Month High
  Low_3M: number | null;    // 3 Month Low
  High_6M: number | null;   // 6 Month High
  Low_6M: number | null;    // 6 Month Low
  price_52_week_high: number | null;  // 52 Week High
  price_52_week_low: number | null;   // 52 Week Low
  High_All: number | null;  // All Time High
  Low_All: number | null;   // All Time Low

  // Technical Indicators - Oscillators
  RSI: number | null;         // RSI (14)
  RSI7: number | null;        // RSI (7)
  Stoch_K: number | null;     // Stochastic %K
  Stoch_D: number | null;     // Stochastic %D
  CCI20: number | null;       // CCI (20)
  ADX: number | null;         // ADX (14)
  ADX_plus_DI: number | null; // +DI (14)
  ADX_minus_DI: number | null; // -DI (14)
  MACD_macd: number | null;   // MACD Line
  MACD_signal: number | null; // MACD Signal
  Mom: number | null;         // Momentum (10)
  AO: number | null;          // Awesome Oscillator
  W_R: number | null;         // Williams %R (14)
  BB_lower: number | null;    // Bollinger Lower Band
  BB_upper: number | null;    // Bollinger Upper Band

  // Volatility
  ATR: number | null;         // Average True Range (14)
  Volatility_D: number | null;  // Daily Volatility
  Volatility_W: number | null;  // Weekly Volatility
  Volatility_M: number | null;  // Monthly Volatility

  // Moving Averages - SMA
  SMA5: number | null;
  SMA10: number | null;
  SMA20: number | null;
  SMA30: number | null;
  SMA50: number | null;
  SMA100: number | null;
  SMA200: number | null;

  // Moving Averages - EMA
  EMA5: number | null;
  EMA10: number | null;
  EMA20: number | null;
  EMA30: number | null;
  EMA50: number | null;
  EMA100: number | null;
  EMA200: number | null;

  // Technical Ratings (-1 to 1 scale: -1=Strong Sell, 1=Strong Buy)
  Recommend_All: number | null;    // Overall Rating
  Recommend_MA: number | null;     // Moving Averages Rating
  Recommend_Other: number | null;  // Oscillators Rating

  // Fundamentals - Valuation
  market_cap_basic: number | null;   // Market Capitalization
  price_earnings_ttm: number | null; // P/E Ratio (TTM)
  price_sales_ratio: number | null;  // P/S Ratio
  price_book_ratio: number | null;   // P/B Ratio
  dividend_yield_recent: number | null;  // Dividend Yield %
  earnings_per_share_basic_ttm: number | null;  // EPS (TTM)
  beta_1_year: number | null;        // 1-Year Beta
  enterprise_value_fq: number | null; // Enterprise Value

  // Fundamentals - Financials
  total_revenue_ttm: number | null;  // Total Revenue (TTM)
  gross_profit_fq: number | null;    // Gross Profit (FQ)
  net_income_fq: number | null;      // Net Income (FQ)
  total_debt_fq: number | null;      // Total Debt (FQ)

  // Volume Metrics
  average_volume_10d_calc: number | null;   // 10-Day Avg Volume
  average_volume_30d_calc: number | null;   // 30-Day Avg Volume
  average_volume_60d_calc: number | null;   // 60-Day Avg Volume
  average_volume_90d_calc: number | null;   // 90-Day Avg Volume
  relative_volume_10d_calc: number | null;  // Relative Volume
  VWAP: number | null;               // Volume Weighted Avg Price

  // Company Info
  sector: string | null;
  industry: string | null;
  country: string | null;
  earnings_release_date: number | null;  // Unix timestamp
}

/**
 * Column category for grouping in the UI
 */
export type ColumnCategory =
  | "basic"
  | "price"
  | "performance"
  | "technicals"
  | "moving_averages"
  | "fundamentals"
  | "volume"
  | "info";

/**
 * Technical rating values
 */
export type TechnicalRating =
  | "Strong Buy"
  | "Buy"
  | "Neutral"
  | "Sell"
  | "Strong Sell";

/**
 * Convert a numeric rating (-1 to 1) to a label
 */
export function getRatingLabel(rating: number | null): TechnicalRating | null {
  if (rating === null) return null;
  if (rating >= 0.5) return "Strong Buy";
  if (rating >= 0.1) return "Buy";
  if (rating >= -0.1) return "Neutral";
  if (rating >= -0.5) return "Sell";
  return "Strong Sell";
}

/**
 * Filter preset configuration
 */
export interface FilterPreset {
  id: string;
  name: string;
  sortBy: keyof Stock;
  sortOrder: "asc" | "desc";
  filter?: {
    field: keyof Stock;
    operator: "gt" | "lt" | "eq" | "gte" | "lte";
    value: number | string;
  }[];
}

/**
 * Column visibility state
 */
export type ColumnVisibility = Record<string, boolean>;
