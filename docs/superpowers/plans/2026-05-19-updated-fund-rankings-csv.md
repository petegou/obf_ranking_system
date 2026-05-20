# Updated Fund Rankings CSV — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate the OBF ranking importer, schema, and UI to ingest the new `Updated Fund Rankings.csv` as the canonical upload format, unlocking metrics the scoring engine already references but never received.

**Architecture:** Single Supabase migration adds `asset_type` to `funds`, `last_price` and any currently-missing scoring inputs to `fund_metrics`. The importer is rewritten around a new column map keyed by the new headers, with name preservation and an uncategorized-row warning channel. The UI surfaces `Asset Type` in the fund detail header and `Last Price` in the rankings grid. No scoring algorithm changes; rankings will shift because the algorithm now has real data for previously-null inputs.

**Tech Stack:** Next.js (App Router) · TypeScript · Supabase (PostgreSQL + PL/pgSQL) · AG Grid · Tailwind. Verification commands: `npx tsc --noEmit`, `npm run lint`, `npm run build`. No unit-test framework is configured; tasks use inline dry-run + DB-inspection checks instead of `pytest`-style asserts.

**Spec:** [`docs/superpowers/specs/2026-05-19-updated-fund-rankings-csv-design.md`](../specs/2026-05-19-updated-fund-rankings-csv-design.md)

**Working directory:** `/Users/nickgoudeau/professionalProjects/obf_ranking_system` (main branch, no worktree). Supabase work uses a feature **branch** project; production migration deferred to Task 10.

---

## Task 1: Inspect live Supabase schema before writing the migration

**Why this task exists:** `supabase/schema.sql` shows an older design where every metric column lived on `funds`. The current system uses separate `funds`, `fund_metrics`, and `fund_rankings` tables (visible in `frontend/lib/scoring.ts` and `frontend/lib/queries.ts`). The migration must reflect the *live* `fund_metrics` schema, not the stale SQL file.

**Files:** (read-only)

- Inspect via Supabase MCP: `mcp__supabase__list_tables` on the production project.

- [ ] **Step 1: List Supabase projects**

Run via tool:
```
mcp__supabase__list_projects
```
Expected: array of projects. Identify the production project ID (the one used by the deployed app at `obf-ranking-system.vercel.app`).

- [ ] **Step 2: List tables in the public schema**

Run via tool:
```
mcp__supabase__list_tables (project_id = <prod id>, schemas = ["public"])
```
Expected: includes `funds`, `fund_metrics`, `fund_rankings`, `scoring_config`, `upload_log`, plus any preset-related tables.

- [ ] **Step 3: Record actual columns on `funds` and `fund_metrics`**

From the `list_tables` response, write down each column name + type for `funds` and `fund_metrics`. Cross-reference against this required set:

`funds`:
- `ticker`, `name`, `category` — must exist
- `asset_type` — **must NOT exist** (we add it)

`fund_metrics`:
- `ticker`, `as_of_date` — must exist (PK)
- These must exist OR be added by Task 2 migration:
  - `inception_date` (DATE)
  - `aum` (DOUBLE PRECISION)
  - `turnover` (DOUBLE PRECISION)
  - `expense_ratio`, `yield_pct`, `pe`, `pb` (DOUBLE PRECISION)
  - `last_price` (DOUBLE PRECISION) — **likely missing**
  - `return_qtd`, `return_ytd`, `return_1yr`, `return_3yr`, `return_5yr`, `return_10yr`
  - `benchmark_return_1yr/3yr/5yr/10yr`
  - `alpha_3yr`, `alpha_5yr`
  - `sharpe_3yr/5yr`, `sortino_3yr/5yr`, `treynor_3yr/5yr`, `info_ratio_3yr/5yr`
  - `r_squared_3yr/5yr`, `tracking_error_3yr/5yr`
  - `up_capture_3yr/5yr`, `down_capture_3yr/5yr`
  - `batting_avg_3yr/5yr`
  - `beta_3yr`, `beta_5yr` — **likely missing**
  - `std_dev_3yr`, `std_dev_5yr` — **likely missing**
  - `kurtosis_3yr`, `kurtosis_5yr` — **likely missing**
  - `skewness_3yr`, `skewness_5yr` — **likely missing**
  - `drawdown_3yr`, `drawdown_5yr` — **likely missing**
  - `downside_dev_3yr`, `downside_dev_5yr` — was in old importer mapping; may exist

- [ ] **Step 4: Save the inspection results to the plan**

Create the file `tasks/2026-05-19-schema-inspection.md` with two markdown tables:

```markdown
# Live schema inspection — 2026-05-19

## funds columns
| column | type | notes |
| ------ | ---- | ----- |
| ticker | text | ... |
...

## fund_metrics columns
| column | type | notes |
| ------ | ---- | ----- |
| ticker | text | PK |
...

## Columns to add in migration 004
- funds.asset_type VARCHAR(50)
- fund_metrics.last_price DOUBLE PRECISION
- fund_metrics.<each missing column from the required set above>
```

No commit yet — this is intermediate notes feeding Task 2.

---

## Task 2: Write migration `004_updated_fund_rankings_schema.sql`

**Files:**
- Create: `supabase/migrations/004_updated_fund_rankings_schema.sql`

- [ ] **Step 1: Author the migration**

Write the file. Use `ADD COLUMN IF NOT EXISTS` for every column so the migration is safe to re-run and works whether or not Task 1 found the column already present.

Template (adjust the `fund_metrics` ADD list to only include columns Task 1 confirmed were missing, but `IF NOT EXISTS` makes overshooting safe):

```sql
-- Migration 004: Updated Fund Rankings CSV ingestion
-- Adds asset_type to funds and last_price + any missing scoring inputs
-- to fund_metrics. Additive only; no RLS changes.

BEGIN;

-- funds: asset_type (stable per ticker, e.g. "Equity", "Non-Equity")
ALTER TABLE funds
  ADD COLUMN IF NOT EXISTS asset_type VARCHAR(50) DEFAULT NULL;

-- fund_metrics: per-snapshot fields the new CSV brings
ALTER TABLE fund_metrics
  ADD COLUMN IF NOT EXISTS last_price        DOUBLE PRECISION DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS inception_date    DATE             DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS aum               DOUBLE PRECISION DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS turnover          DOUBLE PRECISION DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS beta_3yr          DOUBLE PRECISION DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS beta_5yr          DOUBLE PRECISION DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS std_dev_3yr       DOUBLE PRECISION DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS std_dev_5yr       DOUBLE PRECISION DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS kurtosis_3yr      DOUBLE PRECISION DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS kurtosis_5yr      DOUBLE PRECISION DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS skewness_3yr      DOUBLE PRECISION DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS skewness_5yr      DOUBLE PRECISION DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS drawdown_3yr      DOUBLE PRECISION DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS drawdown_5yr      DOUBLE PRECISION DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS downside_dev_3yr  DOUBLE PRECISION DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS downside_dev_5yr  DOUBLE PRECISION DEFAULT NULL;

COMMIT;
```

- [ ] **Step 2: Update `supabase/schema.sql` to reflect the new columns**

The file is reference documentation. Find the `funds` `CREATE TABLE` block and add the `asset_type` line near the General section. The schema file already lists most fund_metrics columns under the (currently-mislabeled) `funds` block — since reorganizing that file is out of scope, only add the columns we know are missing. Mirror the migration order.

- [ ] **Step 3: Lint the SQL by eye**

Open the new migration. Verify:
- Every `ADD COLUMN` has `IF NOT EXISTS`.
- Every type is `DOUBLE PRECISION` except `asset_type` (`VARCHAR(50)`) and `inception_date` (`DATE`).
- Wrapped in a single `BEGIN; ... COMMIT;` block.
- No DROP, no ALTER on RLS policies, no data mutation.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/004_updated_fund_rankings_schema.sql supabase/schema.sql
git commit -m "$(cat <<'EOF'
db: add asset_type, last_price, and scoring inputs to schema

Adds asset_type to funds and the metrics columns the new
'Updated Fund Rankings.csv' provides (beta, std_dev, kurtosis,
skewness, drawdown, dd_dev, last_price, inception_date, aum,
turnover) to fund_metrics. Additive only; ADD COLUMN IF NOT EXISTS
guards make it safe to re-run.

Refs: docs/superpowers/specs/2026-05-19-updated-fund-rankings-csv-design.md

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Apply migration to a Supabase development branch

**Files:** none (Supabase MCP operations).

- [ ] **Step 1: Create a Supabase branch**

Run via tool:
```
mcp__supabase__create_branch (project_id = <prod id>, name = "updated-fund-rankings-csv")
```
Expected: branch is created; record the branch project_id.

- [ ] **Step 2: Apply the migration to the branch**

Read `supabase/migrations/004_updated_fund_rankings_schema.sql` and pass the SQL via:
```
mcp__supabase__apply_migration (
  project_id = <branch id>,
  name = "004_updated_fund_rankings_schema",
  query = <file contents>
)
```
Expected: success response.

- [ ] **Step 3: Confirm the new columns exist on the branch**

Run via tool:
```
mcp__supabase__list_tables (project_id = <branch id>, schemas = ["public"])
```
Verify:
- `funds.asset_type` is now present.
- `fund_metrics.last_price`, `beta_3yr/5yr`, `std_dev_3yr/5yr`, `kurtosis_3yr/5yr`, `skewness_3yr/5yr`, `drawdown_3yr/5yr`, `downside_dev_3yr/5yr` are all present.

- [ ] **Step 4: Run advisors against the branch**

Run via tool:
```
mcp__supabase__get_advisors (project_id = <branch id>, type = "security")
mcp__supabase__get_advisors (project_id = <branch id>, type = "performance")
```
Expected: no new findings introduced by this migration. Existing findings unchanged.

No commit — this task changes only remote state.

---

## Task 4: Rewrite `csv-import.ts` for the new header format

**Files:**
- Modify: `frontend/lib/csv-import.ts` (full replacement of column map + import flow)
- Note: a new field `warnings: string[]` is added to `ImportResult`; downstream callers (`api/upload/route.ts`) are updated in Task 5.

- [ ] **Step 1: Replace the column map**

Open `frontend/lib/csv-import.ts`. Replace the `YCHARTS_COLUMN_MAP` constant (lines 8-53) with the new mapping below. Note the key is lowercased CSV header text:

```ts
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
```

Note: `name` is intentionally NOT in `FUND_REGISTRY_COLS` and not in the column map.

- [ ] **Step 2: Add the `parseInceptionDate` helper**

Insert immediately after `parseNumber`:

```ts
const MONTH_ABBREV: Record<string, string> = {
  jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
  jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12",
};

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
  return { value: `${match[3]}-${month}-${day}`, error: null };
}
```

- [ ] **Step 3: Extend the `ImportResult` interface**

Replace the existing `ImportResult` block with:

```ts
export interface ImportResult {
  rows_total:    number;
  rows_upserted: number;
  rows_skipped:  number;
  errors:        string[];
  warnings:      string[];
}
```

Update the initialization in `importCSV`:

```ts
const result: ImportResult = {
  rows_total:    0,
  rows_upserted: 0,
  rows_skipped:  0,
  errors:        [],
  warnings:      [],
};
```

Add a helper alongside `addError`:

```ts
function addWarning(result: ImportResult, message: string) {
  if (result.warnings.length < MAX_IMPORT_ERRORS) {
    result.warnings.push(message);
  }
}
```

- [ ] **Step 4: Replace header validation**

Find the block that checks for `symbol` and `ycharts benchmark category` and replace with:

```ts
if (!headers.includes("ticker")) {
  addError(result, "Missing required column: 'Ticker'.");
  return result;
}
if (!headers.includes("assigned category")) {
  addError(result, "Missing required column: 'Assigned Category'.");
  return result;
}
```

Update the `colMap` build to use the new map:

```ts
const colMap: [number, string][] = [];
for (let i = 0; i < headers.length; i++) {
  const dbCol = FUND_RANKINGS_COLUMN_MAP[headers[i]];
  if (dbCol) colMap.push([i, dbCol]);
}
```

- [ ] **Step 5: Replace the per-row parse loop**

Find the `for (let rowIdx = 1; rowIdx < rows.length; rowIdx++)` block and replace its body with the version below. Key behavior:
- `asset_type` is parsed as a trimmed string and put on the registry record.
- `inception_date` is parsed via `parseInceptionDate`.
- Numeric fields use existing `parseNumber`.
- Empty `category` ⇒ skip silently, collect the ticker, do NOT add to `result.errors`.
- Update the `fundsBatch` element type to `{ ticker, category, asset_type }` (no `name`).

```ts
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
    const raw = row[csvIdx] ?? "";
    if (dbCol === "ticker" || dbCol === "category" || dbCol === "asset_type") {
      const trimmed = raw.trim();
      parsed[dbCol] = trimmed || null;
    } else if (dbCol === "inception_date") {
      const r = parseInceptionDate(raw);
      if (r.error) {
        rowHasError = true;
        addError(result, `Row ${rowIdx + 1}: ${r.error}`);
      }
      parsed[dbCol] = r.value;
    } else {
      const r = parseNumber(raw, headers[csvIdx] ?? dbCol);
      if (r.error) {
        rowHasError = true;
        addError(result, `Row ${rowIdx + 1}: ${r.error}`);
      }
      parsed[dbCol] = r.value;
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
```

- [ ] **Step 6: Update `logUpload` to persist warnings**

Replace the body of `logUpload` with:

```ts
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
```

- [ ] **Step 7: Update the module docstring**

Replace the top-of-file comment:

```ts
/**
 * CSV import — parse 'Updated Fund Rankings' exports, upsert funds registry,
 * insert fund_metrics. Scoring is triggered separately by the caller.
 */
```

- [ ] **Step 8: Typecheck**

Run from `/Users/nickgoudeau/professionalProjects/obf_ranking_system/frontend`:
```bash
npx tsc --noEmit
```
Expected: passes. If the type of `name` on `funds` upsert payloads is now inferred from the omitted shape and Supabase's generated types complain, narrow the upsert call site or cast the array as `Partial<...>`. The codebase does not import generated Supabase types here, so `supabase.from("funds").upsert(fundsBatch, ...)` should type-check.

- [ ] **Step 9: Commit**

```bash
git add frontend/lib/csv-import.ts
git commit -m "$(cat <<'EOF'
feat(import): rewrite csv-import.ts for Updated Fund Rankings format

- New column map keyed by the 'Updated Fund Rankings.csv' header.
- parseInceptionDate handles the Mon-DD-YYYY format from the CSV.
- ImportResult.warnings carries non-blocking notices (uncategorized
  rows) so the upload succeeds while still recording them in
  upload_log.errors.
- Funds-registry upsert no longer carries name; existing names are
  preserved on conflict.
- Empty Assigned Category rows are skipped silently and reported as
  a single summary warning.

Refs: docs/superpowers/specs/2026-05-19-updated-fund-rankings-csv-design.md

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Surface `warnings` in the upload API route

**Files:**
- Modify: `frontend/app/api/upload/route.ts`

- [ ] **Step 1: Add warnings aggregation to the totals reducer**

In the final response build, the route currently aggregates `errors` across files. Mirror that for `warnings`.

Replace the `totals` reducer near the end of the POST handler with:

```ts
const totals = results.reduce(
  (acc, r) => ({
    rows_total:    acc.rows_total    + r.rows_total,
    rows_upserted: acc.rows_upserted + r.rows_upserted,
    rows_skipped:  acc.rows_skipped  + r.rows_skipped,
    errors:        [...acc.errors,   ...r.errors],
    warnings:      [...acc.warnings, ...r.warnings],
  }),
  { rows_total: 0, rows_upserted: 0, rows_skipped: 0, errors: [] as string[], warnings: [] as string[] }
);
```

- [ ] **Step 2: Include warnings in validation-fail responses too**

The route returns `validationResults` and `results` (with per-file detail) in error responses. Since `ImportResult` now includes `warnings`, those are spread automatically into each per-file response — no change required to those response bodies. Confirm by re-reading `app/api/upload/route.ts` and verifying nothing strips a `warnings` field.

- [ ] **Step 3: Typecheck**

```bash
cd frontend && npx tsc --noEmit
```
Expected: passes.

- [ ] **Step 4: Commit**

```bash
git add frontend/app/api/upload/route.ts
git commit -m "$(cat <<'EOF'
feat(api): surface ImportResult.warnings on upload responses

Aggregates non-blocking warnings (e.g., skipped uncategorized rows)
into the per-file and totals response payloads.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Extend `getFundDetail` to return `asset_type`

**Files:**
- Modify: `frontend/lib/queries.ts` (around line 117-177)

- [ ] **Step 1: Add `asset_type` to the `funds` select**

Find:
```ts
.from("funds")
.select("ticker, name, category")
```
Replace with:
```ts
.from("funds")
.select("ticker, name, category, asset_type")
```

- [ ] **Step 2: Add `asset_type` to the returned object**

In the `return { ... }` block of `getFundDetail`, add `asset_type` between `category` and `as_of_date`:

```ts
return {
  ticker: fund.ticker,
  name: fund.name,
  category: fund.category,
  asset_type: (fund as { asset_type?: string | null }).asset_type ?? null,
  as_of_date: date,
  // ... rest unchanged
```

The inline cast handles the case where Supabase's generated types haven't been regenerated (the codebase does not appear to use generated types, but the cast is cheap insurance).

- [ ] **Step 3: Typecheck**

```bash
cd frontend && npx tsc --noEmit
```
Expected: passes.

- [ ] **Step 4: Commit**

```bash
git add frontend/lib/queries.ts
git commit -m "$(cat <<'EOF'
feat(queries): include asset_type in getFundDetail

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: Show `Asset Type` in the fund detail header

**Files:**
- Modify: `frontend/components/workbench/fund-detail-panel.tsx` (around lines 116-141)

- [ ] **Step 1: Render the asset_type chip**

In `SingleFundDetail`'s `<header>` block, find:

```tsx
<div className="text-xs text-[var(--text-secondary)] mt-0.5 truncate">
  {fund.name}
</div>
```

Replace with:

```tsx
<div className="mt-0.5 flex items-center gap-2 text-xs text-[var(--text-secondary)]">
  <span className="truncate">{fund.name}</span>
  {fund.asset_type ? (
    <span className="rounded-full border border-[var(--border-subtle)] px-2 py-0.5 text-[10px] uppercase tracking-wide text-[var(--text-tertiary)]">
      {fund.asset_type}
    </span>
  ) : null}
</div>
```

Empty name + missing asset_type still degrades gracefully (empty row).

- [ ] **Step 2: Typecheck and lint**

```bash
cd frontend && npx tsc --noEmit && npm run lint
```
Expected: both pass. `FundDetail` (defined via `Awaited<ReturnType<typeof getFundDetail>>`) now includes `asset_type` because of Task 6, so `fund.asset_type` is well-typed.

- [ ] **Step 3: Commit**

```bash
git add frontend/components/workbench/fund-detail-panel.tsx
git commit -m "$(cat <<'EOF'
feat(ui): show asset type chip in fund detail header

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: Add `Last Price` column to the rankings grid

**Files:**
- Modify: `frontend/lib/queries.ts` — extend the `RankingRow` shape and the rankings-fetching query.
- Modify: `frontend/components/workbench/rankings-grid.tsx` — add the column definition and register it in the preset catalog.

- [ ] **Step 1: Confirm where rankings rows are assembled**

Open `frontend/lib/queries.ts`. Find the function that returns per-category ranking rows (the one whose output flows into `<RankingsGrid>`). Look near line 64 (`getCategoryRankings` or similar) and line 145 (`name: fund.name`). It should select from `fund_rankings` joined to `funds` and shape rows for the grid.

If the function does NOT currently include `fund_metrics.last_price`, extend its query: add `last_price` to the metrics select and include it on the returned row as `lastPrice: number | null`.

If the function uses an `RPC` or DB view (`fund_rankings` is a real table per `frontend/lib/scoring.ts`), no view change is needed — just add the field to the select.

Example diff for a hypothetical block fetching rankings:

```ts
// before
.select("category_rank, as_of_date, ticker, ..., funds!inner(name, category)")
// after
.select("category_rank, as_of_date, ticker, ..., funds!inner(name, category), fund_metrics!inner(last_price)")
```

If a join syntax change is needed, this task may instead split: fetch metrics in a second query keyed by `(ticker, as_of_date)` and merge in TypeScript. Use whichever pattern the surrounding code already follows.

- [ ] **Step 2: Add `lastPrice` to the `RankingRow` type**

In `frontend/components/workbench/rankings-grid.tsx`, find the `RankingRow` interface (it includes `aum`, `turnover`, etc. — search around line 84). Add:

```ts
lastPrice: number | null;
```

In `queries.ts`, when assembling the returned row, set `lastPrice` from the metrics row.

- [ ] **Step 3: Register the column in the preset catalog**

In `rankings-grid.tsx`, find the columns-catalog block (around lines 208-214 where `profile.aum`, `profile.turnover`, etc. are listed). Add an entry **before** `profile.expense_ratio`:

```ts
{ columnId: 'profile.last_price', field: 'lastPrice', label: 'Last Price' },
```

- [ ] **Step 4: Register the column's cell renderer**

Find where `currencyCellRenderer` is referenced (around lines 670 and 700) and add a parallel registration for `lastPrice`. Pattern (adjust to match the existing structure):

```ts
{
  colId: 'profile.last_price',
  headerName: 'Last Price',
  field: 'lastPrice',
  type: 'rightAligned',
  cellRenderer: currencyCellRenderer,
  // include the same default width / hide settings used by neighboring profile columns
},
```

If the file maintains a separate `defaultVisibleColumnIds` (or equivalent) set, include `'profile.last_price'` so it shows by default; otherwise, add it next to `profile.expense_ratio` in whatever array determines default visibility.

Note: `formatCurrencyMetric` uses `maximumFractionDigits: 0`, which is wrong for a per-share price like `$30.04`. Add a sibling formatter in `frontend/lib/metric-format.ts`:

```ts
export function formatPriceMetric(value: number): string {
  return value.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
```

Then add an export and a `priceCellRenderer` near the existing `currencyCellRenderer` in `rankings-grid.tsx`:

```ts
import {
  formatCurrencyMetric,
  formatPriceMetric,  // <-- new
  // ... other formatters
} from "@/lib/metric-format";

function priceCellRenderer({ value }: { value: number | null | undefined }) {
  if (value === null || value === undefined) return "";
  return formatPriceMetric(value);
}
```

Use `priceCellRenderer` (not `currencyCellRenderer`) for the `profile.last_price` column registration.

- [ ] **Step 5: Typecheck, lint, build**

```bash
cd frontend && npx tsc --noEmit && npm run lint && npm run build
```
Expected: all three pass. The build is the strictest signal — if the AG Grid column shape changed, the build will catch it.

- [ ] **Step 6: Commit**

```bash
git add frontend/lib/queries.ts frontend/lib/metric-format.ts frontend/components/workbench/rankings-grid.tsx
git commit -m "$(cat <<'EOF'
feat(ui): add Last Price column to the rankings grid

Adds a per-share price column, default-visible in the category
workbench grid, using a 2-decimal currency formatter (the existing
formatCurrencyMetric truncates to whole dollars).

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 9: Full verification pass

**Files:** none.

- [ ] **Step 1: Run all verification commands**

```bash
cd frontend
npx tsc --noEmit
npm run lint
npm run build
```
Expected: all pass. The build warning about multiple lockfiles is pre-existing and acceptable per `tasks/todo.md`.

- [ ] **Step 2: Manual upload against the Supabase branch**

Reconfigure the local dev server's Supabase URL/anon key to the branch project created in Task 3 (export via `.env.local` temporarily; do not commit). Start the dev server, log in as admin, and upload `Updated Fund Rankings.csv` with an `as_of_date` of `2026-05-19`.

Expected response (HTTP 200):
- `rows_total` ≈ 6726
- `rows_skipped` ≈ 3 (the uncategorized rows in the head; could be more)
- `warnings[0]` matches `^Skipped \d+ uncategorized row\(s\): .+`
- `errors` is empty

- [ ] **Step 3: DB-side spot checks via Supabase MCP**

Run via tool:
```sql
-- Asset type populated where present in CSV
SELECT ticker, category, asset_type FROM funds WHERE ticker IN ('AAANX', 'UFOX', 'ACVU') ORDER BY ticker;

-- Last price + new risk metrics populated
SELECT ticker, last_price, beta_3yr, std_dev_3yr, kurtosis_3yr, skewness_3yr, drawdown_3yr
FROM fund_metrics
WHERE as_of_date = '2026-05-19' AND ticker IN ('AAANX', 'UFOX', 'MARB')
ORDER BY ticker;
```
via:
```
mcp__supabase__execute_sql (project_id = <branch id>, query = ...)
```
Expected:
- `AAANX` has `asset_type = 'Non-Equity'`; `UFOX` and `ACVU` are uncategorized (skipped → no funds row for ACVU/UFOX if they weren't already there, or pre-existing row with no `asset_type` update).
- `AAANX` has non-null values for `last_price`, `beta_3yr`, `std_dev_3yr`, `kurtosis_3yr`, `skewness_3yr`, `drawdown_3yr`.

- [ ] **Step 4: Verify rankings recalculation produced scores**

Run via tool:
```sql
SELECT ticker, total_gpa_score, risk_score, return_score
FROM funds
WHERE ticker IN ('AAANX', 'SPYG', 'IVV')
ORDER BY ticker;
```
Expected: non-null `risk_score` for funds with full 3y+5y history. Compare against pre-import scores (if recorded earlier) — they will differ; that is expected.

- [ ] **Step 5: Browser smoke check**

In the same dev server pointed at the branch:
- `/categories/<some-category>` — confirm the `Last Price` column renders with `$30.04`-style formatting.
- Click a fund row — confirm the detail panel shows the `Asset Type` chip next to the name.
- Search for a previously-known fund — confirm its `name` is still present (not blanked).

- [ ] **Step 6: Record verification in `tasks/todo.md`**

Append a new section:

```markdown
# Updated Fund Rankings CSV — Todo

## Active — CSV format refresh
- [x] Inspect live Supabase schema (Task 1).
- [x] Add migration 004 (Task 2).
- [x] Apply migration to Supabase branch (Task 3).
- [x] Rewrite csv-import.ts (Task 4).
- [x] Surface warnings on upload API (Task 5).
- [x] Extend getFundDetail with asset_type (Task 6).
- [x] Add Asset Type chip in detail panel (Task 7).
- [x] Add Last Price column to rankings grid (Task 8).
- [x] Full verification pass on Supabase branch (Task 9).

## Verification
- `npx tsc --noEmit` passed.
- `npm run lint` passed.
- `npm run build` passed (existing lockfile warning).
- Branch upload: <rows_total>, <rows_skipped> skipped uncategorized.
- Spot checks for AAANX/SPYG/IVV confirm new metrics populated and
  scores recomputed.
```

- [ ] **Step 7: Commit**

```bash
git add tasks/todo.md
git commit -m "docs(tasks): record Updated Fund Rankings CSV verification

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 10: Promote migration to production (gated)

**Files:** none.

**Pre-requisite:** Task 9 verification passed end-to-end and the user has reviewed the score-shift on the branch.

- [ ] **Step 1: Confirm with user**

Pause and ask the user: "Branch verification passed. Ready to apply migration 004 to the production Supabase project? Rankings will shift once data flows in with the new metrics."

Do not proceed without explicit approval.

- [ ] **Step 2: Apply migration to production**

```
mcp__supabase__apply_migration (
  project_id = <prod id>,
  name = "004_updated_fund_rankings_schema",
  query = <file contents>
)
```
Expected: success.

- [ ] **Step 3: Confirm production columns**

```
mcp__supabase__list_tables (project_id = <prod id>, schemas = ["public"])
```
Verify `funds.asset_type` and the new `fund_metrics` columns are present.

- [ ] **Step 4: Delete the Supabase branch**

```
mcp__supabase__delete_branch (branch_id = <branch id>)
```
Expected: success. Cleanup, not destructive — branch state has been promoted.

- [ ] **Step 5: Run production advisors**

```
mcp__supabase__get_advisors (project_id = <prod id>, type = "security")
mcp__supabase__get_advisors (project_id = <prod id>, type = "performance")
```
Expected: no new findings introduced.

- [ ] **Step 6: Coordinate first production upload with the user**

The first production upload of `Updated Fund Rankings.csv` is the moment rankings change. Confirm timing with the user before performing it; the admin upload UI is theirs to drive.

No commit (no code changes in this task).

---

## Self-review checklist

Run through this once after writing the plan:

**Spec coverage** — every section A–E of the spec maps to tasks:

- Spec § A (Schema migration) → Tasks 1, 2, 3, 10
- Spec § B (Importer rewrite — column map, parseInceptionDate, warnings, uncategorized handling, name preservation) → Task 4 steps 1–9
- Spec § C (API surface — warnings on response) → Task 5
- Spec § D (UI changes — Asset Type in detail header, Last Price column) → Tasks 6, 7, 8
- Spec § E (Scoring verification — branch upload, spot checks) → Task 9

**Placeholder scan** — none. Every code change includes the actual code. Task 8 has one conditional (RankingRow assembly may live in `queries.ts` or via RPC) and gives concrete branches for each pattern observed in the codebase.

**Type consistency** — `ImportResult.warnings: string[]` defined in Task 4 step 3 is consumed in Task 5 step 1 with matching shape. `RankingRow.lastPrice: number | null` defined in Task 8 step 2 matches the formatter null-check in step 4. `FundDetail.asset_type: string | null` added in Task 6 step 2 is consumed in Task 7 step 1 with a null check.

**Out of scope confirmed** — no tasks change scoring weights/formulas; no tasks regenerate Supabase types; no tasks add a unit-test framework; no tasks touch the YCharts code path (it is deleted, not preserved).
