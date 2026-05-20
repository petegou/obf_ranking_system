/**
 * Data import — parse 'Updated Fund Rankings' exports (.xlsx preferred,
 * .csv accepted for backward compatibility), upsert funds registry, insert
 * fund_metrics. Scoring is triggered separately by the caller.
 *
 * Why .xlsx is preferred: Excel's CSV export serializes the displayed
 * value, not the underlying number. Cells formatted as `0.00%` get
 * multiplied by 100 in the CSV text (e.g. raw 0.0035 becomes "0.35%"),
 * and decimals beyond the display precision are lost (raw 0.006357
 * becomes "0.01"). Reading the .xlsx directly preserves raw cell values
 * so std-dev precision and tracking-error scaling are correct.
 */

import ExcelJS from "exceljs";
import { supabase } from "./supabase";

type Cell = string | number | Date | null;

const FUND_RANKINGS_COLUMN_MAP: Record<string, string> = {
  "ticker":              "ticker",
  "assigned category":   "category",
  "asset type":          "asset_type",
  "inception date":      "inception_date",
  "qtd return":          "return_qtd",
  "ytd return":          "return_ytd",
  "1y return":           "return_1yr",
  "3y return":           "return_3yr",
  "5y return":           "return_5yr",
  "10y return":          "return_10yr",
  "cat 1y return":       "benchmark_return_1yr",
  "cat 3y return":       "benchmark_return_3yr",
  "cat 5y return":       "benchmark_return_5yr",
  "cat 10y return":      "benchmark_return_10yr",
  "fund total assets":   "aum",
  "net expense ratio":   "expense_ratio",
  "turnover":            "turnover",
  "last price":          "last_price",
  "pe ratio":            "pe",
  "pb ratio":            "pb",
  "dividend yield":      "yield_pct",
  "sharpe 3y":           "sharpe_3yr",
  "sharpe 5y":           "sharpe_5yr",
  "sortino 3y":          "sortino_3yr",
  "sortino 5y":          "sortino_5yr",
  "treynor 3y":          "treynor_3yr",
  "treynor 5y":          "treynor_5yr",
  "info ratio 3y":       "info_ratio_3yr",
  "info ratio 5y":       "info_ratio_5yr",
  "beta 3y":             "beta_3yr",
  "beta 5y":             "beta_5yr",
  "std dev 3y":          "std_dev_3yr",
  "std dev 5y":          "std_dev_5yr",
  "tracking error 3y":   "tracking_error_3yr",
  "tracking error 5y":   "tracking_error_5yr",
  "r-squared 3y":        "r_squared_3yr",
  "r-squared 5y":        "r_squared_5yr",
  "alpha 3y":            "alpha_3yr",
  "alpha 5y":            "alpha_5yr",
  "up capture 3y":       "up_capture_3yr",
  "up capture 5y":       "up_capture_5yr",
  "down capture 3y":     "down_capture_3yr",
  "down capture 5y":     "down_capture_5yr",
  "max drawdown 3y":     "drawdown_3yr",
  "max drawdown 5y":     "drawdown_5yr",
  "dd dev 3y":           "downside_dev_3yr",
  "dd dev 5y":           "downside_dev_5yr",
  "kurtosis 3y":         "kurtosis_3yr",
  "kurtosis 5y":         "kurtosis_5yr",
  "skewness 3y":         "skewness_3yr",
  "skewness 5y":         "skewness_5yr",
  "batting avg 3y":      "batting_avg_3yr",
  "batting avg 5y":      "batting_avg_5yr",
};

const FUND_REGISTRY_COLS = new Set(["ticker", "category", "asset_type"]);
const METRICS_COLS = new Set(
  Object.values(FUND_RANKINGS_COLUMN_MAP).filter((c) => !FUND_REGISTRY_COLS.has(c))
);

const BATCH_SIZE = 500;
const MAX_IMPORT_ERRORS = 100;
const TICKER_PATTERN = /^[A-Za-z0-9._-]{1,20}$/;

export interface ImportResult {
  rows_total:    number;
  rows_upserted: number;
  rows_skipped:  number;
  errors:        string[];
  warnings:      string[];
}

function addError(result: ImportResult, message: string) {
  if (result.errors.length < MAX_IMPORT_ERRORS) {
    result.errors.push(message);
  } else if (result.errors.length === MAX_IMPORT_ERRORS) {
    result.errors.push("Additional validation errors were omitted.");
  }
}

function addWarning(result: ImportResult, message: string) {
  if (result.warnings.length < MAX_IMPORT_ERRORS) {
    result.warnings.push(message);
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

const MONTH_ABBREV: Record<string, string> = {
  jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
  jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12",
};

function formatDateISO(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseInceptionDate(val: string): { value: string | null; error: string | null } {
  const trimmed = val.trim();
  if (!trimmed || ["N/A", "NA", "-", "--"].includes(trimmed.toUpperCase())) {
    return { value: null, error: null };
  }
  const match = /^([A-Za-z]{3})-(\d{1,2})-(\d{4})$/.exec(trimmed);
  if (!match) {
    return { value: null, error: "inception_date must be in Mon-DD-YYYY format." };
  }
  const month = MONTH_ABBREV[match[1].toLowerCase()];
  if (!month) {
    return { value: null, error: "inception_date has an unknown month abbreviation." };
  }
  const day = match[2].padStart(2, "0");
  const iso = `${match[3]}-${month}-${day}`;
  const reconstructed = new Date(`${iso}T00:00:00Z`);
  if (
    Number.isNaN(reconstructed.getTime()) ||
    reconstructed.getUTCFullYear() !== Number(match[3]) ||
    reconstructed.getUTCMonth() + 1 !== Number(month) ||
    reconstructed.getUTCDate() !== Number(match[2])
  ) {
    return { value: null, error: "inception_date is not a valid calendar date." };
  }
  return { value: iso, error: null };
}

async function parseXlsx(buffer: ArrayBuffer): Promise<Cell[][]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const sheet = workbook.worksheets[0];
  if (!sheet) return [];

  const rows: Cell[][] = [];
  sheet.eachRow({ includeEmpty: false }, (row) => {
    // row.values is 1-indexed; index 0 is undefined.
    const values = row.values as unknown[];
    const cells: Cell[] = [];
    for (let i = 1; i < values.length; i++) {
      cells.push(toCell(values[i]));
    }
    rows.push(cells);
  });
  return rows;
}

function toCell(v: unknown): Cell {
  if (v === null || v === undefined) return null;
  if (typeof v === "string" || typeof v === "number") return v;
  if (v instanceof Date) return v;
  if (typeof v === "object") {
    // exceljs formula / rich text / error objects expose a `.result`
    // or `.text` we can fall back to.
    const o = v as { result?: unknown; text?: unknown };
    if ("result" in o) return toCell(o.result);
    if ("text" in o) return toCell(o.text);
  }
  return String(v);
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
  file: File,
  asOfDate: string,
  options: { dryRun?: boolean } = {},
): Promise<ImportResult> {
  const filename = file.name;
  const result: ImportResult = {
    rows_total:    0,
    rows_upserted: 0,
    rows_skipped:  0,
    errors:        [],
    warnings:      [],
  };

  let rows: Cell[][];
  try {
    if (filename.toLowerCase().endsWith(".xlsx")) {
      rows = await parseXlsx(await file.arrayBuffer());
    } else {
      const text = await file.text();
      rows = parseCSV(text);
    }
  } catch (err) {
    addError(
      result,
      `Failed to read ${filename}: ${err instanceof Error ? err.message : "unknown error"}`,
    );
    return result;
  }

  if (rows.length < 2) {
    addError(result, "File is empty or has no data rows.");
    return result;
  }

  const headers = rows[0].map((h) =>
    String(h ?? "").replace(/^﻿/, "").trim().toLowerCase()
  );

  if (!headers.includes("ticker")) {
    addError(result, "Missing required column: 'Ticker'.");
    return result;
  }
  if (!headers.includes("assigned category")) {
    addError(result, "Missing required column: 'Assigned Category'.");
    return result;
  }

  const colMap: [number, string][] = [];
  for (let i = 0; i < headers.length; i++) {
    const dbCol = FUND_RANKINGS_COLUMN_MAP[headers[i]];
    if (dbCol) colMap.push([i, dbCol]);
  }

  // Parse all rows first, collecting into batch arrays
  const fundsBatch: { ticker: string; category: string; asset_type: string | null }[] = [];
  const metricsBatch: Record<string, unknown>[] = [];
  const skippedRows = new Set<number>();
  const uncategorizedTickers: string[] = [];

  for (let rowIdx = 1; rowIdx < rows.length; rowIdx++) {
    const row = rows[rowIdx];
    result.rows_total++;

    const parsed: Record<string, unknown> = {};
    let rowHasError = false;

    for (const [csvIdx, dbCol] of colMap) {
      const raw = row[csvIdx];
      if (dbCol === "ticker" || dbCol === "category" || dbCol === "asset_type") {
        const trimmed = raw === null || raw === undefined ? "" : String(raw).trim();
        parsed[dbCol] = trimmed || null;
      } else if (dbCol === "inception_date") {
        if (raw instanceof Date) {
          parsed[dbCol] = formatDateISO(raw);
        } else {
          const text = raw === null || raw === undefined ? "" : String(raw);
          const r = parseInceptionDate(text);
          if (r.error) {
            rowHasError = true;
            addError(result, `Row ${rowIdx + 1}: ${r.error}`);
          }
          parsed[dbCol] = r.value;
        }
      } else {
        // Numeric column. xlsx gives us a raw number; CSV gives us a string.
        if (typeof raw === "number") {
          parsed[dbCol] = Number.isFinite(raw) ? raw : null;
        } else if (raw === null || raw === undefined) {
          parsed[dbCol] = null;
        } else {
          const r = parseNumber(String(raw), headers[csvIdx] ?? dbCol);
          if (r.error) {
            rowHasError = true;
            addError(result, `Row ${rowIdx + 1}: ${r.error}`);
          }
          parsed[dbCol] = r.value;
        }
      }
    }

    const ticker = (parsed.ticker as string | null) ?? "";
    if (!ticker) {
      rowHasError = true;
      addError(result, `Row ${rowIdx + 1}: missing ticker.`);
    } else if (!TICKER_PATTERN.test(ticker)) {
      rowHasError = true;
      addError(result, `Row ${rowIdx + 1}: ticker must be 20 characters or fewer and contain only letters, numbers, dots, underscores, or hyphens.`);
    }

    const category = parsed.category as string | null;
    if (!category) {
      // Uncategorized: skip silently. Do NOT mark rowHasError.
      skippedRows.add(rowIdx);
      if (ticker) uncategorizedTickers.push(ticker);
      continue;
    }
    if (category.length > 100) {
      rowHasError = true;
      addError(result, `Row ${rowIdx + 1}: category exceeds 100 characters.`);
    }

    const assetType = (parsed.asset_type as string | null) ?? null;
    if (assetType && assetType.length > 50) {
      rowHasError = true;
      addError(result, `Row ${rowIdx + 1}: asset_type exceeds 50 characters.`);
    }

    if (rowHasError) {
      skippedRows.add(rowIdx);
      continue;
    }

    fundsBatch.push({ ticker, category, asset_type: assetType });

    const metricsRecord: Record<string, unknown> = { ticker, as_of_date: asOfDate };
    for (const [, dbCol] of colMap) {
      if (METRICS_COLS.has(dbCol)) metricsRecord[dbCol] = parsed[dbCol] ?? null;
    }
    metricsBatch.push(metricsRecord);
  }

  result.rows_skipped = skippedRows.size;

  if (uncategorizedTickers.length > 0) {
    const preview = uncategorizedTickers.slice(0, 20).join(", ");
    const suffix = uncategorizedTickers.length > 20
      ? `, … (+${uncategorizedTickers.length - 20} more)`
      : "";
    addWarning(
      result,
      `Skipped ${uncategorizedTickers.length} uncategorized row(s): ${preview}${suffix}`,
    );
  }
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
  const combined = [
    ...result.errors,
    ...result.warnings.map((w) => `WARNING: ${w}`),
  ].slice(0, 50);

  await supabase.from("upload_log").insert({
    filename,
    rows_total:    result.rows_total,
    rows_inserted: result.rows_upserted,
    rows_updated:  0,
    rows_skipped:  result.rows_skipped,
    errors:        combined.length > 0 ? combined.join("\n") : null,
  });
}
