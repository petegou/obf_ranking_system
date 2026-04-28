/**
 * CSV import — parse YCharts comp_table exports, upsert funds registry,
 * insert fund_metrics. Scoring is triggered separately by the caller.
 */

import { supabase } from "./supabase";

const YCHARTS_COLUMN_MAP: Record<string, string> = {
  "symbol":                                                    "ticker",
  "name":                                                      "name",
  "ycharts benchmark category":                                "category",
  "net expense ratio":                                         "expense_ratio",
  "quarter to date total returns (daily)":                     "return_qtd",
  "year to date total returns (daily)":                        "return_ytd",
  "1 year total returns (daily)":                              "return_1yr",
  "3 year total returns (daily)":                              "return_3yr",
  "5 year total returns (daily)":                              "return_5yr",
  "10 year total returns (daily)":                             "return_10yr",
  "category 1 year total return":                              "benchmark_return_1yr",
  "category 3 year total return":                              "benchmark_return_3yr",
  "category 5 year total return":                              "benchmark_return_5yr",
  "category 10 year total return":                             "benchmark_return_10yr",
  "standard deviation of daily returns (3y lookback)":         "std_dev_3yr",
  "standard deviation of daily returns (5y lookback)":         "std_dev_5yr",
  "alpha (3y)":                                                "alpha_3yr",
  "alpha (5y)":                                                "alpha_5yr",
  "r-squared (vs category) (3y)":                              "r_squared_3yr",
  "r-squared (vs category) (5y)":                              "r_squared_5yr",
  "upside (3y)":                                               "up_capture_3yr",
  "upside (5y)":                                               "up_capture_5yr",
  "downside (3y)":                                             "down_capture_3yr",
  "downside (5y)":                                             "down_capture_5yr",
  "information ratio (vs category) (3y)":                      "info_ratio_3yr",
  "information ratio (vs category) (5y)":                      "info_ratio_5yr",
  "historical sharpe ratio (3y)":                              "sharpe_3yr",
  "historical sharpe ratio (5y)":                              "sharpe_5yr",
  "tracking error (vs category) (3y)":                         "tracking_error_3yr",
  "tracking error (vs category) (5y)":                         "tracking_error_5yr",
  "batting average (3y lookback)":                             "batting_avg_3yr",
  "batting average (5y lookback)":                             "batting_avg_5yr",
  "weighted average price to book ratio":                      "pb",
  "weighted average pe ratio":                                 "pe",
  "dividend yield":                                            "yield_pct",
  "downside deviation of monthly price returns (3y lookback)": "downside_dev_3yr",
  "downside deviation of monthly price returns (5y lookback)": "downside_dev_5yr",
  "max drawdown (3y)":                                         "drawdown_3yr",
  "max drawdown (5y)":                                         "drawdown_5yr",
  "historical sortino (3y)":                                   "sortino_3yr",
  "historical sortino (5y)":                                   "sortino_5yr",
  "treynor measure historical (vs category) (3y)":             "treynor_3yr",
  "treynor measure historical (vs category) (5y)":             "treynor_5yr",
  "minimum initial investment":                                "min_initial_investment",
};

const FUND_REGISTRY_COLS = new Set(["ticker", "name", "category"]);
const METRICS_COLS = new Set(
  Object.values(YCHARTS_COLUMN_MAP).filter((c) => !FUND_REGISTRY_COLS.has(c))
);

const BATCH_SIZE = 500;

export interface ImportResult {
  rows_total: number;
  rows_upserted: number;
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

async function batchUpsert(
  table: string,
  records: Record<string, unknown>[],
  onConflict: string
): Promise<string | null> {
  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const chunk = records.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from(table).upsert(chunk, { onConflict });
    if (error) return error.message;
  }
  return null;
}

export async function importCSV(
  csvText: string,
  filename: string,
  asOfDate: string
): Promise<ImportResult> {
  const result: ImportResult = {
    rows_total:   0,
    rows_upserted: 0,
    rows_skipped: 0,
    errors:       [],
  };

  const rows = parseCSV(csvText);
  if (rows.length < 2) {
    result.errors.push("CSV file is empty or has no data rows.");
    return result;
  }

  const headers = rows[0].map((h) =>
    h.replace(/^﻿/, "").trim().toLowerCase()
  );

  if (!headers.includes("symbol")) {
    result.errors.push("Missing required column: 'Symbol'.");
    return result;
  }
  if (!headers.includes("ycharts benchmark category")) {
    result.errors.push("Missing required column: 'YCharts Benchmark Category'.");
    return result;
  }

  const colMap: [number, string][] = [];
  for (let i = 0; i < headers.length; i++) {
    const dbCol = YCHARTS_COLUMN_MAP[headers[i]];
    if (dbCol) colMap.push([i, dbCol]);
  }

  // Parse all rows first, collecting into batch arrays
  const fundsBatch: { ticker: string; name: string; category: string }[] = [];
  const metricsBatch: Record<string, unknown>[] = [];

  for (let rowIdx = 1; rowIdx < rows.length; rowIdx++) {
    const row = rows[rowIdx];
    result.rows_total++;

    const parsed: Record<string, unknown> = {};
    for (const [csvIdx, dbCol] of colMap) {
      const raw = row[csvIdx] ?? "";
      parsed[dbCol] = FUND_REGISTRY_COLS.has(dbCol) ? raw.trim() : parseNumber(raw);
    }

    const ticker = parsed.ticker as string;
    if (!ticker) {
      result.rows_skipped++;
      result.errors.push(`Row ${rowIdx + 1}: missing ticker, skipped.`);
      continue;
    }

    fundsBatch.push({
      ticker,
      name:     (parsed.name     as string) || "",
      category: (parsed.category as string) || "",
    });

    const metricsRecord: Record<string, unknown> = { ticker, as_of_date: asOfDate };
    for (const [, dbCol] of colMap) {
      if (METRICS_COLS.has(dbCol)) metricsRecord[dbCol] = parsed[dbCol] ?? null;
    }
    metricsBatch.push(metricsRecord);
  }

  // Bulk upsert funds registry
  const fundsError = await batchUpsert("funds", fundsBatch, "ticker");
  if (fundsError) {
    result.errors.push(`Funds registry upsert failed: ${fundsError}`);
    result.rows_skipped += fundsBatch.length;
    await logUpload(filename, result, asOfDate);
    return result;
  }

  // Bulk upsert metrics
  const metricsError = await batchUpsert("fund_metrics", metricsBatch, "ticker,as_of_date");
  if (metricsError) {
    result.errors.push(`Metrics upsert failed: ${metricsError}`);
    result.rows_skipped += metricsBatch.length;
  } else {
    result.rows_upserted = metricsBatch.length;
  }

  await logUpload(filename, result, asOfDate);
  return result;
}

async function logUpload(
  filename: string,
  result: ImportResult,
  asOfDate: string
): Promise<void> {
  await supabase.from("upload_log").insert({
    filename,
    rows_total:    result.rows_total,
    rows_inserted: result.rows_upserted,
    rows_updated:  0,
    rows_skipped:  result.rows_skipped,
    errors:
      result.errors.length > 0 ? result.errors.slice(0, 50).join("\n") : null,
  });
}
