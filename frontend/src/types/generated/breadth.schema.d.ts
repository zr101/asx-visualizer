/* Generated from schemas/. Do not edit — run npm run types:generate */

/**
 * The daily breadth series. Columnar because it is one row per session.
 */
export interface BreadthFile {
  columns: {
    [k: string]: (number | string | boolean | null)[];
  };
  fields: string[];
  n: number;
}
