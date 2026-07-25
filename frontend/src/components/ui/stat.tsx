import { cn } from "@/lib/utils";

interface StatProps {
  label: string;
  value: string;
  hint?: string;
  tone?: "positive" | "negative" | "neutral";
  className?: string;
}

/**
 * A single headline number.
 *
 * When the data's job is "one value a reader should remember", a chart is the
 * wrong form - the number itself is the visualisation.
 */
export function Stat({ label, value, hint, tone = "neutral", className }: StatProps) {
  return (
    <div className={cn("rounded-lg border border-border bg-card p-4", className)}>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p
        className={cn(
          "mt-1.5 font-mono text-2xl font-semibold tabular-nums",
          tone === "positive" && "text-positive",
          tone === "negative" && "text-negative",
        )}
      >
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

/** A labelled proportion bar, for "N% of the market is X". */
export function Gauge({
  label,
  percent,
  hint,
}: {
  label: string;
  percent: number | null;
  hint?: string;
}) {
  const value = percent ?? 0;
  // Participation reads as healthy above half, stretched below a fifth.
  const tone = value >= 50 ? "var(--positive)" : value >= 25 ? "var(--chart-accent)" : "var(--negative)";

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-baseline justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p className="font-mono text-lg font-semibold tabular-nums">
          {percent === null ? "–" : `${value.toFixed(1)}%`}
        </p>
      </div>
      <div
        className="mt-2 h-2 overflow-hidden rounded-full bg-muted"
        role="img"
        aria-label={`${label}: ${percent === null ? "no data" : `${value.toFixed(1)} percent`}`}
      >
        <div
          className="h-full rounded-full transition-[width]"
          style={{ width: `${Math.min(100, Math.max(0, value))}%`, backgroundColor: tone }}
        />
      </div>
      {hint && <p className="mt-1.5 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
