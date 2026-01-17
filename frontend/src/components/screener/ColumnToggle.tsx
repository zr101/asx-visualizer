"use client";

import { Table } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { columnGroups } from "@/lib/columns";

interface ColumnToggleProps<TData> {
  table: Table<TData>;
}

export function ColumnToggle<TData>({ table }: ColumnToggleProps<TData>) {
  const allColumns = table.getAllColumns().filter((column) => column.getCanHide());

  // Get column by id
  const getColumn = (columnId: string) => {
    return allColumns.find((col) => col.id === columnId);
  };

  // Get header name for a column
  const getColumnHeader = (columnId: string): string => {
    const column = getColumn(columnId);
    if (!column) return columnId;
    const header = column.columnDef.header;
    if (typeof header === "string") return header;
    return columnId;
  };

  // Count visible columns
  const visibleCount = allColumns.filter((col) => col.getIsVisible()).length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <ColumnsIcon />
          Columns
          <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-xs font-medium text-primary">
            {visibleCount}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-64 max-h-[400px] overflow-y-auto"
      >
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Toggle Columns</span>
          <div className="flex gap-1">
            <button
              className="text-xs text-primary hover:underline"
              onClick={() => {
                allColumns.forEach((col) => {
                  if (col.id !== "ticker") {
                    col.toggleVisibility(true);
                  }
                });
              }}
            >
              All
            </button>
            <span className="text-muted-foreground">/</span>
            <button
              className="text-xs text-primary hover:underline"
              onClick={() => {
                allColumns.forEach((col) => {
                  if (col.id !== "ticker") {
                    col.toggleVisibility(false);
                  }
                });
              }}
            >
              None
            </button>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {Object.entries(columnGroups).map(([groupKey, group]) => (
          <div key={groupKey}>
            <DropdownMenuLabel className="text-xs text-muted-foreground font-normal py-1">
              {group.label}
            </DropdownMenuLabel>
            {group.columns.map((columnId) => {
              const column = getColumn(columnId);
              if (!column) return null;

              return (
                <DropdownMenuCheckboxItem
                  key={columnId}
                  checked={column.getIsVisible()}
                  onCheckedChange={(checked) => column.toggleVisibility(checked)}
                  disabled={!column.getCanHide()}
                  className="capitalize"
                >
                  {getColumnHeader(columnId)}
                </DropdownMenuCheckboxItem>
              );
            })}
            <DropdownMenuSeparator />
          </div>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Icon Components
function ColumnsIcon() {
  return (
    <svg
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 4v16M15 4v16M3 8h18M3 16h18"
      />
    </svg>
  );
}
