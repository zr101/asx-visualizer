"use client";

import {
  AreaSeries,
  ColorType,
  HistogramSeries,
  LineSeries,
  createChart,
} from "lightweight-charts";
import type { IChartApi, ISeriesApi, UTCTimestamp } from "lightweight-charts";
import { useEffect, useMemo, useRef, useState } from "react";

export interface SeriesPoint {
  date: string;
  value: number | null;
}

export interface SeriesSpec {
  label: string;
  data: SeriesPoint[];
  /** CSS custom property resolved at mount, so charts follow the active theme. */
  colorVar?: "--chart-accent" | "--positive" | "--negative" | "--foreground";
  type?: "line" | "area" | "histogram";
  precision?: number;
}

interface Props {
  series: SeriesSpec[];
  height?: number;
  /** Fixed y-axis window, e.g. [0, 100] for a percentage gauge. */
  range?: [number, number];
  showLegend?: boolean;
}

/**
 * Read a CSS custom property and normalise it to `rgb()`.
 *
 * The theme is authored in `oklch()`, which getComputedStyle resolves to
 * `lab()` in Chrome. lightweight-charts parses only hex, rgb and named colours,
 * and throws outright on anything else — which took the whole page down rather
 * than degrading. Painting the value into a canvas lets the browser do the
 * conversion, so any current or future colour syntax resolves correctly.
 */
function cssValue(name: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  if (!raw) return fallback;
  if (raw.startsWith("#") || raw.startsWith("rgb")) return raw;

  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 1;
  const context = canvas.getContext("2d");
  if (!context) return fallback;

  context.fillStyle = fallback;
  context.fillStyle = raw; // ignored by the browser if `raw` is unparseable
  context.fillRect(0, 0, 1, 1);
  const [r, g, b, a] = context.getImageData(0, 0, 1, 1).data;
  return a === 255 ? `rgb(${r}, ${g}, ${b})` : `rgba(${r}, ${g}, ${b}, ${a / 255})`;
}

/** lightweight-charts wants opaque colour strings, so alpha is applied here. */
function withAlpha(color: string, alpha: number): string {
  const match = color.match(/^rgba?\(([^)]+)\)$/);
  if (match) {
    const [r, g, b] = match[1].split(",").map((part) => parseFloat(part));
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  if (/^#[0-9a-f]{6}$/i.test(color)) {
    const value = parseInt(color.slice(1), 16);
    return `rgba(${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255}, ${alpha})`;
  }
  return color;
}

const toTime = (date: string): UTCTimestamp =>
  (Date.parse(`${date}T00:00:00Z`) / 1000) as UTCTimestamp;

/**
 * Time-series chart on lightweight-charts.
 *
 * Deliberately single-axis: two measures on different scales get two stacked
 * charts sharing an x-axis, never a second y-axis. A dual y-axis lets whoever
 * drew it put the crossover wherever the story needs it.
 */
export function TimeSeriesChart({ series, height = 260, range, showLegend = true }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<{ date: string; values: (number | null)[] } | null>(null);
  const [colors, setColors] = useState<string[]>([]);

  // Effects must depend on primitives, not on the `series` array - a new array
  // identity on every parent render would otherwise tear down and rebuild the
  // whole chart each time. This key changes only when the content does.
  const specKey = useMemo(
    () =>
      JSON.stringify(
        series.map((s) => [s.label, s.type, s.colorVar, s.precision, s.data.length,
                           s.data[0]?.date, s.data.at(-1)?.date, s.data.at(-1)?.value]),
      ),
    [series],
  );
  const rangeKey = range ? `${range[0]}:${range[1]}` : "";

  // Hold the props stable until their content actually changes, so the effect
  // below can depend on them directly instead of reading a ref during render.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const specs = useMemo(() => series, [specKey]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const bounds = useMemo(() => range, [rangeKey]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resolved = specs.map((s) => cssValue(s.colorVar ?? "--chart-accent", "#2962ff"));
    setColors(resolved);

    const chart: IChartApi = createChart(container, {
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: cssValue("--chart-axis", "#787b86"),
        fontSize: 11,
        attributionLogo: false,
      },
      grid: {
        vertLines: { visible: false },
        horzLines: { color: cssValue("--chart-grid", "#2a2e39"), style: 1 },
      },
      rightPriceScale: { borderVisible: false, scaleMargins: { top: 0.14, bottom: 0.08 } },
      timeScale: { borderVisible: false, fixLeftEdge: true, fixRightEdge: true },
      crosshair: {
        mode: 1,
        vertLine: { labelVisible: true, width: 1, style: 2 },
        horzLine: { labelVisible: false, width: 1, style: 2 },
      },
      handleScale: false,
      handleScroll: false,
      height,
    });

    const handles: ISeriesApi<"Line" | "Area" | "Histogram">[] = specs.map((spec, index) => {
      const color = resolved[index];
      const priceFormat = {
        type: "price" as const,
        precision: spec.precision ?? 2,
        minMove: 10 ** -(spec.precision ?? 2),
      };
      const common = { priceLineVisible: false, lastValueVisible: false, priceFormat };

      const handle =
        spec.type === "area"
          ? chart.addSeries(AreaSeries, {
              ...common,
              lineColor: color,
              topColor: withAlpha(color, 0.18),
              bottomColor: withAlpha(color, 0),
              lineWidth: 2,
            })
          : spec.type === "histogram"
            ? chart.addSeries(HistogramSeries, { ...common, color })
            : chart.addSeries(LineSeries, { ...common, color, lineWidth: 2 });

      handle.setData(
        spec.data
          .filter((p) => p.value !== null && Number.isFinite(p.value))
          .map((p) => ({ time: toTime(p.date), value: p.value as number })),
      );

      if (bounds) {
        handle.applyOptions({
          autoscaleInfoProvider: () => ({
            priceRange: { minValue: bounds[0], maxValue: bounds[1] },
          }),
        });
      }
      return handle as ISeriesApi<"Line" | "Area" | "Histogram">;
    });

    chart.timeScale().fitContent();

    // A line chart without a hover readout forces the reader to estimate values
    // off the axis, so the crosshair layer ships by default.
    chart.subscribeCrosshairMove((param) => {
      if (!param.time || !param.point) {
        setHover(null);
        return;
      }
      setHover({
        date: new Date((param.time as number) * 1000).toISOString().slice(0, 10),
        values: handles.map(
          (handle) => (param.seriesData.get(handle) as { value?: number } | undefined)?.value ?? null,
        ),
      });
    });

    const observer = new ResizeObserver(([entry]) => {
      if (entry?.contentRect.width) chart.applyOptions({ width: entry.contentRect.width });
    });
    observer.observe(container);
    chart.applyOptions({ width: container.clientWidth });

    return () => {
      observer.disconnect();
      chart.remove();
    };
  }, [specs, bounds, height]);

  return (
    <div className="relative">
      <div ref={containerRef} className="w-full" style={{ height }} />
      {showLegend && (
        <div className="pointer-events-none absolute left-1 top-0 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
          {series.map((spec, index) => (
            <span key={spec.label} className="flex items-center gap-1.5">
              <span
                aria-hidden
                className="inline-block h-0.5 w-3 rounded-full"
                style={{ backgroundColor: colors[index] ?? "currentColor" }}
              />
              <span className="text-muted-foreground">{spec.label}</span>
              {hover?.values[index] != null && (
                <span className="font-mono tabular-nums text-foreground">
                  {hover.values[index]!.toFixed(spec.precision ?? 2)}
                </span>
              )}
            </span>
          ))}
          {hover && <span className="font-mono text-muted-foreground">{hover.date}</span>}
        </div>
      )}
    </div>
  );
}
