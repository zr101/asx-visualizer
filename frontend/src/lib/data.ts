/**
 * Data loaders.
 *
 * Server-side readers pull from disk at build time, so the numbers are baked
 * into the static HTML and no dataset reaches the browser. The one exception is
 * the screener, which fetches its ~800 KB payload at runtime on the route that
 * actually needs it - it should never be part of the initial page load.
 */
import fs from "node:fs/promises";
import path from "node:path";

import type {
  CoverageFile,
  Manifest,
  Pulse,
  ScreenerFile,
  SearchEntry,
  SectorsFile,
  SeriesFile,
  SignalsFile,
  BreadthPoint,
  Columnar,
} from "@/types/data";
import { unpackColumnar } from "@/lib/columnar";

const PUBLIC_DATA = path.join(process.cwd(), "public", "data");
const BUILD_DATA = path.join(process.cwd(), "data");

async function readJson<T>(file: string, dir = PUBLIC_DATA): Promise<T> {
  return JSON.parse(await fs.readFile(path.join(dir, file), "utf-8")) as T;
}

export const getManifest = () => readJson<Manifest>("manifest.json");
export const getPulse = () => readJson<Pulse>("pulse.json");
export const getSignals = () => readJson<SignalsFile>("signals.json");
export const getSectors = () => readJson<SectorsFile>("sectors.json");
export const getCoverage = () => readJson<CoverageFile>("coverage.json");
export const getSearchIndex = () => readJson<SearchEntry[]>("search.json");

export async function getBreadthHistory(): Promise<BreadthPoint[]> {
  return unpackColumnar<BreadthPoint>(await readJson<Columnar>("breadth.json"));
}

export async function getScreener(): Promise<ScreenerFile> {
  return readJson<ScreenerFile>("screener.json");
}

/**
 * Per-ticker price history. Large (~4.6 MB) and build-time only, so it is
 * memoised at module scope: `generateStaticParams` renders ~2,000 pages and
 * re-reading and re-parsing this per page would dominate the build.
 */
let seriesCache: Promise<SeriesFile> | null = null;

export function getSeries(): Promise<SeriesFile> {
  if (!seriesCache) seriesCache = readJson<SeriesFile>("series.json", BUILD_DATA);
  return seriesCache;
}

export interface StockSeriesPoint {
  date: string;
  close: number | null;
  volume: number | null;
}

export async function getStockSeries(symbol: string): Promise<StockSeriesPoint[]> {
  const { sessions, series } = await getSeries();
  const entry = series[symbol];
  if (!entry) return [];
  return entry.i.map((sessionIndex, position) => ({
    date: sessions[sessionIndex],
    close: entry.c[position] ?? null,
    volume: entry.v[position] ?? null,
  }));
}
