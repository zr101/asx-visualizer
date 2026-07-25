"use client";

import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
  type VisibilityState,
} from "@tanstack/react-table";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Download,
  Link2,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import {
  DEFAULT_COLUMNS,
  screenerColumns,
} from "@/lib/screener-columns";
import {
  EMPTY_FILTERS,
  NUMERIC_FILTERS,
  activeFilterCount,
  applyFilters,
  fromSearchParams,
  toCsv,
  toSearchParams,
  type FilterState,
  type NumericFilterKey,
} from "@/components/screener/ScreenerFilters";
import { cn } from "@/lib/utils";
import type { ScreenerRow } from "@/types/data";

const PRESETS: Array<{ label: string; hint: string; build: () => FilterState }> = [
  {
    label: "Oversold",
    hint: "RSI below 30",
    build: () => ({ ...EMPTY_FILTERS, ranges: { RSI: { min: null, max: 30 } } }),
  },
  {
    label: "Above 200DMA",
    hint: "In a primary uptrend",
    build: () => ({
      ...EMPTY_FILTERS,
      ranges: { pct_vs_sma200: { min: 0, max: null } },
    }),
  },
  {
    label: "Income",
    hint: "Yield over 4%",
    build: () => ({
      ...EMPTY_FILTERS,
      ranges: { dividend_yield_recent: { min: 4, max: null } },
    }),
  },
  {
    label: "Strong RS",
    hint: "Rating 80+",
    build: () => ({ ...EMPTY_FILTERS, ranges: { rs_rating: { min: 80, max: null } } }),
  },
  {
    label: "Liquid large caps",
    hint: "Over $1B, $1M+ traded",
    build: () => ({
      ...EMPTY_FILTERS,
      ranges: {
        market_cap_basic: { min: 1, max: null },
        turnover: { min: 1, max: null },
      },
    }),
  },
];

export function Screener({ rows, date }: { rows: ScreenerRow[]; date: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initial = useMemo(
    () => fromSearchParams(new URLSearchParams(searchParams.toString())),
    [searchParams],
  );

  const [filters, setFilters] = useState<FilterState>(initial.filters);
  const [sorting, setSorting] = useState<SortingState>(
    initial.sort
      ? [{ id: initial.sort.replace(/^-/, ""), desc: initial.sort.startsWith("-") }]
      : [{ id: "market_cap_basic", desc: true }],
  );
  const [showFilters, setShowFilters] = useState(false);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(() =>
    Object.fromEntries(
      screenerColumns.map((column) => {
        const id = (column as { accessorKey?: string }).accessorKey ?? "";
        return [id, DEFAULT_COLUMNS.includes(id)];
      }),
    ),
  );

  const sectors = useMemo(
    () =>
      Array.from(new Set(rows.map((row) => row.sector).filter(Boolean))).sort() as string[],
    [rows],
  );

  const { rows: filtered, excludedForMissingData } = useMemo(
    () => applyFilters(rows, filters),
    [rows, filters],
  );

  // Mirror state into the URL so a screen can be bookmarked or shared. `replace`
  // rather than `push` keeps the back button useful instead of stepping through
  // every keystroke.
  useEffect(() => {
    const sort = sorting[0]
      ? `${sorting[0].desc ? "-" : ""}${sorting[0].id}`
      : undefined;
    const params = toSearchParams(filters, sort);
    const next = params.toString();
    if (next !== searchParams.toString()) {
      router.replace(next ? `/screener?${next}` : "/screener", { scroll: false });
    }
  }, [filters, sorting, router, searchParams]);

  const table = useReactTable({
    data: filtered,
    columns: screenerColumns,
    state: { sorting, columnVisibility },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 50 } },
    sortDescFirst: true,
  });

  const activeCount = activeFilterCount(filters);

  const setRange = (key: NumericFilterKey, bound: "min" | "max", raw: string) => {
    setFilters((current) => {
      const existing = current.ranges[key] ?? { min: null, max: null };
      const value = raw === "" ? null : Number(raw);
      return {
        ...current,
        ranges: {
          ...current.ranges,
          [key]: { ...existing, [bound]: Number.isNaN(value) ? null : value },
        },
      };
    });
  };

  const exportCsv = () => {
    const fields = table
      .getVisibleLeafColumns()
      .map((column) => column.id)
      .filter(Boolean);
    const csv = toCsv(
      table.getSortedRowModel().rows.map((row) => row.original),
      fields,
    );
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `asx-screen-${date}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={filters.query}
          onChange={(event) =>
            setFilters((current) => ({ ...current, query: event.target.value }))
          }
          placeholder="Filter by ticker or company…"
          aria-label="Filter by ticker or company"
          className="h-9 min-w-0 flex-1 rounded-md border border-border bg-card px-3 text-sm outline-none focus:border-chart-accent"
        />

        <select
          value={filters.sector ?? ""}
          onChange={(event) =>
            setFilters((current) => ({
              ...current,
              sector: event.target.value || null,
            }))
          }
          aria-label="Filter by sector"
          className="h-9 rounded-md border border-border bg-card px-2 text-sm"
        >
          <option value="">All sectors</option>
          {sectors.map((sector) => (
            <option key={sector} value={sector}>
              {sector}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={() => setShowFilters((open) => !open)}
          className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border bg-card px-3 text-sm"
          aria-expanded={showFilters}
        >
          <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden />
          Filters
          {activeCount > 0 && (
            <span className="rounded-full bg-chart-accent px-1.5 text-xs text-white">
              {activeCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={exportCsv}
          className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border bg-card px-3 text-sm"
        >
          <Download className="h-3.5 w-3.5" aria-hidden />
          <span className="hidden sm:inline">CSV</span>
        </button>

        <button
          type="button"
          onClick={() => navigator.clipboard?.writeText(window.location.href)}
          className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border bg-card px-3 text-sm"
          title="Copy a link to this screen"
        >
          <Link2 className="h-3.5 w-3.5" aria-hidden />
          <span className="hidden sm:inline">Share</span>
        </button>
      </div>

      {/* Presets */}
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((preset) => (
          <button
            key={preset.label}
            type="button"
            onClick={() => setFilters(preset.build())}
            title={preset.hint}
            className="rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground hover:text-foreground"
          >
            {preset.label}
          </button>
        ))}
        {activeCount > 0 && (
          <button
            type="button"
            onClick={() => setFilters(EMPTY_FILTERS)}
            className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <X className="h-3 w-3" aria-hidden />
            Clear
          </button>
        )}
      </div>

      {showFilters && (
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {(Object.keys(NUMERIC_FILTERS) as NumericFilterKey[]).map((key) => {
              const config = NUMERIC_FILTERS[key];
              const range = filters.ranges[key] ?? { min: null, max: null };
              return (
                <div key={key}>
                  <label className="text-xs text-muted-foreground" htmlFor={`${key}-min`}>
                    {config.label} {config.unit && `(${config.unit})`}
                  </label>
                  <div className="mt-1 flex gap-2">
                    <input
                      id={`${key}-min`}
                      type="number"
                      step={config.step}
                      value={range.min ?? ""}
                      onChange={(event) => setRange(key, "min", event.target.value)}
                      placeholder="min"
                      className="h-8 w-full rounded-md border border-border bg-background px-2 text-sm"
                    />
                    <input
                      aria-label={`${config.label} maximum`}
                      type="number"
                      step={config.step}
                      value={range.max ?? ""}
                      onChange={(event) => setRange(key, "max", event.target.value)}
                      placeholder="max"
                      className="h-8 w-full rounded-md border border-border bg-background px-2 text-sm"
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <label className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={filters.nullPolicy === "include"}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  nullPolicy: event.target.checked ? "include" : "exclude",
                }))
              }
            />
            Keep stocks with no value for a filtered metric
            <span className="text-muted-foreground/70">
              (off by default — two-thirds of ASX stocks have no P/E because they
              lose money)
            </span>
          </label>

          <details className="mt-4">
            <summary className="cursor-pointer text-xs text-muted-foreground">
              Columns ({table.getVisibleLeafColumns().length} shown)
            </summary>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {table.getAllLeafColumns().map((column) => (
                <button
                  key={column.id}
                  type="button"
                  onClick={column.getToggleVisibilityHandler()}
                  disabled={!column.getCanHide()}
                  className={cn(
                    "rounded border px-2 py-0.5 text-xs",
                    column.getIsVisible()
                      ? "border-chart-accent bg-chart-accent/10 text-foreground"
                      : "border-border text-muted-foreground",
                  )}
                >
                  {String(column.columnDef.header)}
                </button>
              ))}
            </div>
          </details>
        </div>
      )}

      <p className="text-sm text-muted-foreground">
        {filtered.length.toLocaleString()} of {rows.length.toLocaleString()} securities
        {excludedForMissingData > 0 && (
          <span className="ml-1">
            · {excludedForMissingData.toLocaleString()} excluded for missing data
          </span>
        )}
      </p>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-card">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="border-b border-border">
                {headerGroup.headers.map((header) => {
                  const align =
                    (header.column.columnDef.meta as { align?: string })?.align ?? "right";
                  const sorted = header.column.getIsSorted();
                  return (
                    <th
                      key={header.id}
                      scope="col"
                      aria-sort={
                        sorted === "asc"
                          ? "ascending"
                          : sorted === "desc"
                            ? "descending"
                            : "none"
                      }
                      className={cn(
                        "whitespace-nowrap px-3 py-2 text-xs font-medium text-muted-foreground",
                        align === "left" ? "text-left" : "text-right",
                      )}
                    >
                      <button
                        type="button"
                        onClick={header.column.getToggleSortingHandler()}
                        className="inline-flex items-center gap-1 hover:text-foreground"
                      >
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                        {sorted === "asc" && <ChevronUp className="h-3 w-3" aria-hidden />}
                        {sorted === "desc" && (
                          <ChevronDown className="h-3 w-3" aria-hidden />
                        )}
                      </button>
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.length === 0 && (
              <tr>
                <td
                  colSpan={table.getVisibleLeafColumns().length}
                  className="px-3 py-12 text-center text-sm text-muted-foreground"
                >
                  Nothing matches these filters.
                </td>
              </tr>
            )}
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id} className="border-b border-border last:border-0 hover:bg-accent/30">
                {row.getVisibleCells().map((cell) => {
                  const align =
                    (cell.column.columnDef.meta as { align?: string })?.align ?? "right";
                  return (
                    <td
                      key={cell.id}
                      className={cn(
                        "whitespace-nowrap px-3 py-1.5",
                        align === "left" ? "text-left" : "text-right",
                      )}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          Page {table.getState().pagination.pageIndex + 1} of{" "}
          {Math.max(table.getPageCount(), 1)}
        </span>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className="rounded-md border border-border p-1.5 disabled:opacity-40"
            aria-label="Previous page"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            className="rounded-md border border-border p-1.5 disabled:opacity-40"
            aria-label="Next page"
          >
            <ChevronRight className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </div>
    </div>
  );
}
