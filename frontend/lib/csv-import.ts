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
const MAX_IMPORT_ERRORS = 100;
const TICKER_PATTERN = /^[A-Za-z0-9._-]{1,20}$/;

export interface ImportResult {
  rows_total: number;
  rows_upserted: number;
  rows_skipped: number;
  errors: string[];
}

function addError(result: ImportResult, message: string) {
  if (result.errors.length < MAX_IMPORT_ERRORS) {
    result.errors.push(message);
  } else if (result.errors.length === MAX_IMPORT_ERRORS) {
    result.errors.push("Additional validation errors were omitted.");
  }
}

function parseNumber(val: string, fieldName: string) {
  const trimmed = val.trim();
  if (!trimmed || ["N/A", "NA", "-", "--"].includes(trimmed.toUpperCase())) {
    return { value: null, error: null };
  }

  const negativeWrapped =
    trimmed.startsWith("(") && trimmed.endsWith(")")
      ? `-${trimmed.slice(1, -1)}`
      : trimmed;
  const cleaned = negativeWrapped.replace(/[%,$]/g, "").replace(/,/g, "").trim();
  const numericPattern = /^[-+]?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?$/i;

  if (!numericPattern.test(cleaned)) {
    return { value: null, error: `${fieldName} must be numeric.` };
  }

  const n = Number(cleaned);
  return Number.isFinite(n)
    ? { value: n, error: null }
    : { value: null, error: `${fieldName} must be finite.` };
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
  asOfDate: string,
  options: { dryRun?: boolean } = {},
): Promise<ImportResult> {
  const result: ImportResult = {
    rows_total:   0,
    rows_upserted: 0,
    rows_skipped: 0,
    errors:       [],
  };

  const rows = parseCSV(csvText);
  if (rows.length < 2) {
    addError(result, "CSV file is empty or has no data rows.");
    return result;
  }

  const headers = rows[0].map((h) =>
    h.replace(/^﻿/, "").trim().toLowerCase()
  );

  if (!headers.includes("symbol")) {
    addError(result, "Missing required column: 'Symbol'.");
    return result;
  }
  if (!headers.includes("ycharts benchmark category")) {
    addError(result, "Missing required column: 'YCharts Benchmark Category'.");
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
  const skippedRows = new Set<number>();

  for (let rowIdx = 1; rowIdx < rows.length; rowIdx++) {
    const row = rows[rowIdx];
    result.rows_total++;

    const parsed: Record<string, unknown> = {};
    let rowHasError = false;
    for (const [csvIdx, dbCol] of colMap) {
      const raw = row[csvIdx] ?? "";
      if (FUND_REGISTRY_COLS.has(dbCol)) {
        parsed[dbCol] = raw.trim();
      } else {
        const parsedNumber = parseNumber(raw, headers[csvIdx] ?? dbCol);
        if (parsedNumber.error) {
          rowHasError = true;
          addError(result, `Row ${rowIdx + 1}: ${parsedNumber.error}`);
        }
        parsed[dbCol] = parsedNumber.value;
      }
    }

    const ticker = parsed.ticker as string;
    if (!ticker) {
      rowHasError = true;
      addError(result, `Row ${rowIdx + 1}: missing ticker.`);
    } else if (!TICKER_PATTERN.test(ticker)) {
      rowHasError = true;
      addError(result, `Row ${rowIdx + 1}: ticker must be 20 characters or fewer and contain only letters, numbers, dots, underscores, or hyphens.`);
    }

    const name = (parsed.name as string | undefined) || "";
    if (name.length > 255) {
      rowHasError = true;
      addError(result, `Row ${rowIdx + 1}: fund name exceeds 255 characters.`);
    }

    const category = (parsed.category as string | undefined) || "";
    if (!category) {
      rowHasError = true;
      addError(result, `Row ${rowIdx + 1}: missing category.`);
    } else if (category.length > 100) {
      rowHasError = true;
      addError(result, `Row ${rowIdx + 1}: category exceeds 100 characters.`);
    }

    if (rowHasError) {
      skippedRows.add(rowIdx);
      continue;
    }

    fundsBatch.push({
      ticker,
      name,
      category,
    });

    const metricsRecord: Record<string, unknown> = { ticker, as_of_date: asOfDate };
    for (const [, dbCol] of colMap) {
      if (METRICS_COLS.has(dbCol)) metricsRecord[dbCol] = parsed[dbCol] ?? null;
    }
    metricsBatch.push(metricsRecord);
  }

  result.rows_skipped = skippedRows.size;
  if (result.errors.length > 0) {
    if (!options.dryRun) {
      await logUpload(filename, result);
    }
    return result;
  }

  if (options.dryRun) {
    return result;
  }

  // Bulk upsert funds registry
  const fundsError = await batchUpsert("funds", fundsBatch, "ticker");
  if (fundsError) {
    addError(result, `Funds registry upsert failed: ${fundsError}`);
    result.rows_skipped += fundsBatch.length;
    await logUpload(filename, result);
    return result;
  }

  // Bulk upsert metrics
  const metricsError = await batchUpsert("fund_metrics", metricsBatch, "ticker,as_of_date");
  if (metricsError) {
    addError(result, `Metrics upsert failed: ${metricsError}`);
    result.rows_skipped += metricsBatch.length;
  } else {
    result.rows_upserted = metricsBatch.length;
  }

  await logUpload(filename, result);
  return result;
}

async function logUpload(
  filename: string,
  result: ImportResult
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
