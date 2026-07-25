import { SectorBars } from "@/components/charts/SectorBars";
import { RotationTable } from "@/components/sectors/RotationTable";
import { getSectors } from "@/lib/data";
import { formatDate } from "@/lib/format";

export const metadata = {
  title: "Sectors",
  description: "Sector performance and rotation across the ASX, cap- and equal-weighted.",
};

export default async function SectorsPage() {
  const sectors = await getSectors();

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Sectors</h1>
        <p className="mt-1 text-sm text-muted-foreground">{formatDate(sectors.date)}</p>
      </header>

      <section aria-labelledby="today" className="space-y-3">
        <h2 id="today" className="text-lg font-semibold">
          Today
        </h2>
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-lg border border-border bg-card p-4">
            <h3 className="mb-1 text-sm font-medium">Cap-weighted</h3>
            <p className="mb-3 text-xs text-muted-foreground">
              What the sector did as an investment — dominated by its largest members.
            </p>
            <SectorBars sectors={sectors.latest} metric="cap_weighted_1d" />
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <h3 className="mb-1 text-sm font-medium">Equal-weighted</h3>
            <p className="mb-3 text-xs text-muted-foreground">
              What the typical company in it did. Where this disagrees with the
              cap-weighted figure, a few large names are carrying the sector.
            </p>
            <SectorBars sectors={sectors.latest} metric="equal_weighted_1d" />
          </div>
        </div>
      </section>

      <section aria-labelledby="rotation" className="space-y-3">
        <h2 id="rotation" className="text-lg font-semibold">
          Rotation
        </h2>
        <p className="text-sm text-muted-foreground">
          Cap-weighted returns by window, with each sector&apos;s rank in that window.
          Reading across a row shows whether leadership is recent or sustained.
        </p>
        <RotationTable rows={sectors.rotation} />
      </section>

      <p className="text-xs text-muted-foreground">
        Sector labels come from the data provider&apos;s taxonomy, not GICS. It is heavily
        skewed toward resources — over 40% of ASX listings sit in a single sector — which
        is a real feature of this market rather than a classification error.
      </p>
    </div>
  );
}
