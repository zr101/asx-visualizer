/* Generated from schemas/. Do not edit — run npm run types:generate */

export interface ScreenerFile {
  columns: {
    [k: string]: (number | string | boolean | null)[];
  };
  date: string;
  fields: string[];
  n: number;
}
