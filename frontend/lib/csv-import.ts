/**
 * CSV import — parse, validate, and UPSERT fund data into Supabase.
 */

import { supabase } from "./supabase";
import { recalculateAllRankings } from "./scoring";

const CSV_COLUMN_MAP: Record<string, string> = {
  ticker: "ticker",
  name: "name",
  category: "category",
  inception_date: "inception_date",
  aum: "aum",
  turnover: "turnover",
  expense_ratio: "expense_ratio",
  yield: "yield_pct",
  pe: "pe",
  pb: "pb",
  beta_3yr: "beta_3yr",
  beta_5yr: "beta_5yr",
  r_squared_3yr: "r_squared_3yr",
  r_squared_5yr: "r_squared_5yr",
  up_capture_3yr: "up_capture_3yr",
  up_capture_5yr: "up_capture_5yr",
  down_capture_3yr: "down_capture_3yr",
  down_capture_5yr: "down_capture_5yr",
  sharpe_3yr: "sharpe_3yr",
  sharpe_5yr: "sharpe_5yr",
  tracking_error_3yr: "tracking_error_3yr",
  tracking_error_5yr: "tracking_error_5yr",
  sortino_3yr: "sortino_3yr",
  sortino_5yr: "sortino_5yr",
  treynor_3yr: "treynor_3yr",
  treynor_5yr: "treynor_5yr",
  info_ratio_3yr: "info_ratio_3yr",
  info_ratio_5yr: "info_ratio_5yr",
  kurtosis_3yr: "kurtosis_3yr",
  kurtosis_5yr: "kurtosis_5yr",
  drawdown_3yr: "drawdown_3yr",
  drawdown_5yr: "drawdown_5yr",
  skewness_3yr: "skewness_3yr",
  skewness_5yr: "skewness_5yr",
  alpha_3yr: "alpha_3yr",
  alpha_5yr: "alpha_5yr",
  return_1yr: "return_1yr",
  return_3yr: "return_3yr",
  return_5yr: "return_5yr",
  return_10yr: "return_10yr",
  return_ytd: "return_ytd",
  return_qtd: "return_qtd",
  benchmark_return_1yr: "benchmark_return_1yr",
  benchmark_return_3yr: "benchmark_return_3yr",
  benchmark_return_5yr: "benchmark_return_5yr",
  benchmark_return_10yr: "benchmark_return_10yr",
  batting_avg_3yr: "batting_avg_3yr",
  batting_avg_5yr: "batting_avg_5yr",
};

const STRING_COLS = new Set(["ticker", "name", "category"]);
const DATE_COLS = new Set(["inception_date"]);

export interface ImportResult {
  rows_total: number;
  rows_inserted: number;
  rows_updated: number;
  rows_skipped: number;
  errors: string[];
}

function parseNumber(val: string): number | null {
  if (!val || ["N/A", "NA", "-", "--", ""].includes(val.trim().toUpperCase()))
    return null;
  const cleaned = val.trim().replace(/%/g, "").replace(/,/g, "");
  const n = parseFloat(cleaned);
  return isNaN(n) ? null : n;
}

function parseDate(val: string): string | null {
  if (!val || !val.trim()) return null;
  const v = val.trim();
  // Try YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  // Try MM/DD/YYYY
  const m = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[1].padStart(2, "0")}-${m[2].padStart(2, "0")}`;
  return null;
}

function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let current: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cell += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        current.push(cell);
        cell = "";
      } else if (ch === "\n" || (ch === "\r" && text[i + 1] === "\n")) {
        current.push(cell);
        cell = "";
        if (current.length > 1 || current[0] !== "") rows.push(current);
        current = [];
        if (ch === "\r") i++;
      } else {
        cell += ch;
      }
    }
  }
  current.push(cell);
  if (current.length > 1 || current[0] !== "") rows.push(current);
  return rows;
}

export async function importCSV(
  csvText: string,
  filename: string
): Promise<ImportResult> {
  const result: ImportResult = {
    rows_total: 0,
    rows_inserted: 0,
    rows_updated: 0,
    rows_skipped: 0,
    errors: [],
  };

  const rows = parseCSV(csvText);
  if (rows.length < 2) {
    result.errors.push("CSV file is empty or has no data rows.");
    return result;
  }

  // Normalize headers — strip BOM
  const headers = rows[0].map((h) =>
    h.replace(/^\uFEFF/, "").trim().toLowerCase()
  );

  // Validate required columns
  if (!headers.includes("ticker") || !headers.includes("category")) {
    result.errors.push(
      "Missing required columns: 'ticker' and 'category' are required."
    );
    return result;
  }

  // Build column map: headerIndex → dbColumn
  const colMap: [number, string][] = [];
  for (let i = 0; i < headers.length; i++) {
    const dbCol = CSV_COLUMN_MAP[headers[i]];
    if (dbCol) colMap.push([i, dbCol]);
  }

  // Check what tickers already exist
  const { data: existingFunds } = await supabase
    .from("funds")
    .select("ticker, category");
  const existingSet = new Set(
    (existingFunds ?? []).map((f) => `${f.ticker}|${f.category}`)
  );

  for (let rowIdx = 1; rowIdx < rows.length; rowIdx++) {
    const row = rows[rowIdx];
    result.rows_total++;

    const record: Record<string, unknown> = {};
    for (const [csvIdx, dbCol] of colMap) {
      const raw = row[csvIdx] ?? "";
      if (STRING_COLS.has(dbCol)) {
        record[dbCol] = raw.trim();
      } else if (DATE_COLS.has(dbCol)) {
        record[dbCol] = parseDate(raw);
      } else {
        record[dbCol] = parseNumber(raw);
      }
    }

    const ticker = record.ticker as string;
    const category = record.category as string;
    if (!ticker || !category) {
      result.rows_skipped++;
      result.errors.push(`Row ${rowIdx + 1}: missing ticker or category.`);
      continue;
    }

    const key = `${ticker}|${category}`;
    const exists = existingSet.has(key);

    if (exists) {
      // Update
      const { error } = await supabase
        .from("funds")
        .update(record)
        .eq("ticker", ticker)
        .eq("category", category);

      if (error) {
        result.rows_skipped++;
        result.errors.push(`Row ${rowIdx + 1} (${ticker}): ${error.message}`);
      } else {
        result.rows_updated++;
      }
    } else {
      // Insert
      const { error } = await supabase.from("funds").insert(record);

      if (error) {
        result.rows_skipped++;
        result.errors.push(`Row ${rowIdx + 1} (${ticker}): ${error.message}`);
      } else {
        result.rows_inserted++;
        existingSet.add(key);
      }
    }
  }

  // Log the upload
  await supabase.from("upload_log").insert({
    filename,
    rows_total: result.rows_total,
    rows_inserted: result.rows_inserted,
    rows_updated: result.rows_updated,
    rows_skipped: result.rows_skipped,
    errors:
      result.errors.length > 0 ? result.errors.slice(0, 50).join("\n") : null,
  });

  // Recalculate all rankings
  await recalculateAllRankings();

  return result;
}
