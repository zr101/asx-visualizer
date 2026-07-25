import type { Columnar } from "@/types/data";

/**
 * Expand a columnar payload into row objects.
 *
 * Lives in `lib` rather than `types` because it is runtime code. It previously
 * sat in the types module, which meant nothing in the app could take a
 * type-only import of the data layer.
 *
 * The generic is an assertion, not a check - it names what the caller expects
 * rather than verifying it. What makes that safe now is that the row types are
 * generated from the same schema the payload is serialised from, so the two
 * cannot disagree without CI failing.
 */
export function unpackColumnar<T>(payload: Columnar | undefined): T[] {
  if (!payload || !payload.n) return [];
  const { n, fields, columns } = payload;
  const rows: T[] = new Array(n);
  for (let i = 0; i < n; i++) {
    const row: Record<string, unknown> = {};
    for (const field of fields) row[field] = columns[field]?.[i] ?? null;
    rows[i] = row as T;
  }
  return rows;
}
