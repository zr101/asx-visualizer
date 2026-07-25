import { formatShare } from "@/lib/format";
import type { Breadth } from "@/types/data";

/**
 * Advancers vs decliners as a single proportional bar.
 *
 * The counts alone ("306 up, 716 down") require mental arithmetic to interpret;
 * the proportion is the thing being asked about, so it is what gets drawn.
 * Untraded securities are shown separately rather than folded into "unchanged"
 * — roughly 16% of ASX common stocks don't trade on a given day, and calling
 * that "unchanged" implies a decision that nobody made.
 */
export function BreadthStrip({ breadth }: { breadth: Breadth }) {
  const { advancers, decliners, unchanged, untraded } = breadth;
  const total = advancers + decliners + unchanged + untraded;
  if (!total) return null;

  const segments = [
    { key: "Advancing", value: advancers, color: "var(--positive)" },
    { key: "Declining", value: decliners, color: "var(--negative)" },
    { key: "Unchanged", value: unchanged, color: "var(--chart-axis)" },
    { key: "Did not trade", value: untraded, color: "var(--chart-grid)" },
  ].filter((segment) => segment.value > 0);

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div
        className="flex h-7 w-full gap-0.5 overflow-hidden rounded-md"
        role="img"
        aria-label={segments.map((s) => `${s.key} ${s.value}`).join(", ")}
      >
        {segments.map((segment) => (
          <div
            key={segment.key}
            className="h-full first:rounded-l-md last:rounded-r-md"
            style={{
              width: `${(segment.value / total) * 100}%`,
              backgroundColor: segment.color,
            }}
          />
        ))}
      </div>

      <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm">
        {segments.map((segment) => (
          <div key={segment.key} className="flex items-center gap-2">
            <span
              aria-hidden
              className="h-2.5 w-2.5 shrink-0 rounded-sm"
              style={{ backgroundColor: segment.color }}
            />
            <dt className="text-muted-foreground">{segment.key}</dt>
            <dd className="font-mono tabular-nums">
              {segment.value.toLocaleString()}
              <span className="ml-1 text-xs text-muted-foreground">
                {formatShare((segment.value / total) * 100)}
              </span>
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
