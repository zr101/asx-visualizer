import { Suspense } from "react";

import { Screener } from "@/components/screener/Screener";
import { getScreener } from "@/lib/data";
import { formatDate } from "@/lib/format";
import { unpackColumnar } from "@/lib/columnar";
import type { ScreenerRow } from "@/types/data";

export const metadata = {
  title: "Screener",
  description:
    "Filter every ASX-listed security on price, momentum, valuation and factor scores.",
};

export default async function ScreenerPage() {
  const file = await getScreener();
  const rows = unpackColumnar<ScreenerRow>(file);

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Screener</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {rows.length.toLocaleString()} securities · {formatDate(file.date)} ·
          filters and sorting are stored in the URL, so a screen can be shared
        </p>
      </header>

      {/* useSearchParams needs a Suspense boundary, or the whole route opts out
          of static rendering. */}
      <Suspense
        fallback={<div className="h-96 animate-pulse rounded-lg border border-border bg-card" />}
      >
        <Screener rows={rows} date={file.date} />
      </Suspense>
    </div>
  );
}
