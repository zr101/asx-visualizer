"use client";

import { useState, useMemo } from "react";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  SortingState,
  VisibilityState,
  useReactTable,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { defaultVisibleColumns } from "@/lib/columns";
import { Stock } from "@/types";
import { ColumnToggle } from "./ColumnToggle";
import {
  FilterPanel,
  FilterCriteria,
  defaultFilters,
  applyFilters,
} from "./FilterPanel";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
}

export function DataTable<TData extends Stock, TValue>({
  columns,
  data,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [pageSize, setPageSize] = useState(25);
  const [filters, setFilters] = useState<FilterCriteria>(defaultFilters);

  // Initialize column visibility from defaultVisibleColumns
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(
    () => {
      const visibility: VisibilityState = {};
      columns.forEach((col) => {
        const colId = (col as { accessorKey?: string; id?: string }).id ||
          (col as { accessorKey?: string }).accessorKey;
        if (colId) {
          visibility[colId] = defaultVisibleColumns.includes(colId);
        }
      });
      return visibility;
    }
  );

  // Apply filters to data
  const filteredData = useMemo(() => {
    return applyFilters(data, filters) as TData[];
  }, [data, filters]);

  const table = useReactTable({
    data: filteredData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    state: {
      sorting,
      columnVisibility,
    },
    initialState: {
      pagination: {
        pageSize: 25,
      },
    },
  });

  // Update page size when changed
  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    table.setPageSize(newSize);
  };

  // Check if column is the first (ticker) column
  const isFirstColumn = (columnId: string) => columnId === "ticker";

  return (
    <div className="space-y-4">
      {/* Toolbar: Filters and Column Toggle */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <FilterPanel
          data={data}
          filters={filters}
          onFilterChange={setFilters}
          table={table}
        />
        <div className="flex items-center gap-2">
          <ColumnToggle table={table} />
        </div>
      </div>

      {/* Results count */}
      <div className="text-sm text-muted-foreground">
        Showing {filteredData.length} of {data.length} stocks
        {filters.sector !== "Any" && ` in ${filters.sector}`}
        {filters.industry !== "Any" && ` - ${filters.industry}`}
      </div>

      {/* Table Container with Sticky Header and Always-Visible Scrollbar */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="h-[calc(100vh-300px)] overflow-auto table-scroll-container">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-card">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} className="border-b border-border hover:bg-transparent">
                  {headerGroup.headers.map((header, index) => (
                    <TableHead
                      key={header.id}
                      className={cn(
                        "bg-muted/50 font-semibold text-foreground",
                        header.column.getCanSort() && "cursor-pointer select-none hover:bg-muted",
                        isFirstColumn(header.column.id) && "sticky-header-col-first"
                      )}
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      <div className="flex items-center gap-1">
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                        {/* Sorting Indicator */}
                        {{
                          asc: <SortAscIcon />,
                          desc: <SortDescIcon />,
                        }[header.column.getIsSorted() as string] ?? (
                          header.column.getCanSort() ? <SortIcon /> : null
                        )}
                      </div>
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                    className="border-b border-border/50 hover:bg-muted/30"
                  >
                    {row.getVisibleCells().map((cell, index) => (
                      <TableCell
                        key={cell.id}
                        className={cn(
                          isFirstColumn(cell.column.id) && "sticky-col-first"
                        )}
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-24 text-center text-muted-foreground"
                  >
                    No results found. Try adjusting your filters.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Pagination Controls */}
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>
            Showing {table.getState().pagination.pageIndex * pageSize + 1} to{" "}
            {Math.min(
              (table.getState().pagination.pageIndex + 1) * pageSize,
              filteredData.length
            )}{" "}
            of {filteredData.length} stocks
          </span>
        </div>

        <div className="flex items-center gap-4">
          {/* Page Size Selector */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Rows per page:</span>
            <select
              value={pageSize}
              onChange={(e) => handlePageSizeChange(Number(e.target.value))}
              className="h-8 rounded-md border border-border bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>

          {/* Page Navigation */}
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
            >
              <ChevronDoubleLeftIcon />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <ChevronLeftIcon />
            </Button>
            <span className="flex items-center gap-1 px-2 text-sm">
              <span className="text-muted-foreground">Page</span>
              <span className="font-medium">
                {table.getState().pagination.pageIndex + 1}
              </span>
              <span className="text-muted-foreground">of</span>
              <span className="font-medium">{table.getPageCount()}</span>
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              <ChevronRightIcon />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
            >
              <ChevronDoubleRightIcon />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Icon Components
function SortIcon() {
  return (
    <svg
      className="h-4 w-4 text-muted-foreground/50"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
      />
    </svg>
  );
}

function SortAscIcon() {
  return (
    <svg
      className="h-4 w-4 text-primary"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M5 15l7-7 7 7"
      />
    </svg>
  );
}

function SortDescIcon() {
  return (
    <svg
      className="h-4 w-4 text-primary"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M19 9l-7 7-7-7"
      />
    </svg>
  );
}

function ChevronLeftIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  );
}

function ChevronDoubleLeftIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
    </svg>
  );
}

function ChevronDoubleRightIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
    </svg>
  );
}
