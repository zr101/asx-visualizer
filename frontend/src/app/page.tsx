"use client";

import { TradingViewWidget } from "@/components/charts/TradingViewWidget";
import { DataTable } from "@/components/screener/DataTable";
import { columns } from "@/lib/columns";
import { Stock } from "@/types";
import stockData from "../../public/data.json";

export default function Home() {
  const data = stockData as Stock[];

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                ASX Stock Screener
              </h1>
              <p className="text-sm text-muted-foreground">
                Australian Stock Exchange Market Data
              </p>
            </div>
            <div className="text-right text-sm text-muted-foreground">
              <p>{data.length} stocks</p>
              <p>Last updated: {new Date().toLocaleDateString()}</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        {/* TradingView Chart Section */}
        <section className="mb-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border border-border bg-card p-4">
              <h2 className="mb-2 text-sm font-medium text-muted-foreground">
                S&P/ASX 200
              </h2>
              <TradingViewWidget symbol="ASX:XJO" height={220} />
            </div>
            <div className="rounded-lg border border-border bg-card p-4">
              <h2 className="mb-2 text-sm font-medium text-muted-foreground">
                All Ordinaries
              </h2>
              <TradingViewWidget symbol="ASX:XAO" height={220} />
            </div>
          </div>
        </section>

        {/* Stock Screener Table */}
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Stock Screener</h2>
          </div>
          <DataTable columns={columns} data={data} />
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-card py-4">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>
            Data provided by TradingView. For informational purposes only.
          </p>
        </div>
      </footer>

      {/* Attribution Footer */}
      <footer className="w-full py-6 text-center text-sm text-muted-foreground border-t mt-8">
        Built by Zaeem Rizan
      </footer>
    </div>
  );
}
