import { WatchlistView } from "@/app/watchlist/WatchlistView";
import { getScreener } from "@/lib/data";
import { formatDate } from "@/lib/format";
import { unpackColumnar } from "@/lib/columnar";
import type { ScreenerRow } from "@/types/data";

export const metadata = {
  title: "Watchlist",
  description: "Track a personal set of ASX stocks.",
};

export default async function WatchlistPage() {
  const file = await getScreener();
  const rows = unpackColumnar<ScreenerRow>(file);

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Watchlist</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {formatDate(file.date)} · stored in this browser only — nothing is sent anywhere
        </p>
      </header>
      <WatchlistView rows={rows} />
    </div>
  );
}
