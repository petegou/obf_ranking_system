# Updated Fund Rankings CSV — Design

> Adapt the OBF Ranking System to ingest the new official data file
> (`Updated Fund Rankings.csv`) as the standard upload going forward.
> This unlocks metrics the scoring engine already references (beta, std_dev,
> kurtosis, skewness, drawdown, dd_dev) that the previous importer never
> captured, so rankings will materially change once this lands.

## Context

### Current behavior

- `frontend/lib/csv-import.ts` is hardwired to a YCharts comp_table export
  with headers like `Symbol`, `YCharts Benchmark Category`,
  `Net Expense Ratio`, etc.
- Import writes to two tables: `funds` (registry: `ticker`, `name`,
  `category`) and `fund_metrics` (per-snapshot metrics keyed by
  `(ticker, as_of_date)`).
- `frontend/lib/scoring.ts` references metrics that the YCharts importer
  never produced: `beta_3yr/5yr`, `std_dev_3yr/5yr`, `kurtosis_3yr/5yr`,
  `skewness_3yr/5yr`, `drawdown_3yr/5yr`. Those scoring components have
  effectively been null.

### New CSV (`Updated Fund Rankings.csv`)

- 6,726 data rows, 53 columns.
- Header:
  `Ticker, Assigned Category, Asset Type, Inception Date, QTD Return,
  YTD Return, 1Y Return, 3Y Return, 5Y Return, 10Y Return, Cat 1Y Return,
  Cat 3Y Return, Cat 5Y Return, Cat 10Y Return, Fund Total Assets,
  Net Expense Ratio, Turnover, Last Price, PE Ratio, PB Ratio,
  Dividend Yield, Sharpe 3Y/5Y, Sortino 3Y/5Y, Treynor 3Y/5Y,
  Info Ratio 3Y/5Y, Beta 3Y/5Y, Std Dev 3Y/5Y, Tracking Error 3Y/5Y,
  R-Squared 3Y/5Y, Alpha 3Y/5Y, Up Capture 3Y/5Y, Down Capture 3Y/5Y,
  Max Drawdown 3Y/5Y, DD Dev 3Y/5Y, Kurtosis 3Y/5Y, Skewness 3Y/5Y,
  Batting Avg 3Y/5Y`.
- **Adds** the metrics scoring already expected: Beta, Std Dev, Kurtosis,
  Skewness, Max Drawdown, DD Dev. Also Inception Date, Fund Total Assets
  (AUM), Turnover.
- **New fields not yet in the schema:** `Asset Type`, `Last Price`.
- **No longer in CSV:** fund display `Name`, `Minimum Initial Investment`.
- A small number of rows have an empty `Assigned Category` (3 in the head).

### Decisions captured during brainstorming

| Decision           | Chosen approach                                                                                        |
| ------------------ | ------------------------------------------------------------------------------------------------------ |
| Scope              | Full refresh — import mapping + schema + scoring verification.                                         |
| Fund name handling | Preserve existing names; new tickers get the schema default (`''`).                                    |
| Uncategorized rows | Skip silently; count in `rows_skipped`; one summary line in `upload_log.errors`.                       |
| Asset Type / Last Price | Add to schema and surface in the UI immediately.                                                  |
| Old YCharts format | Replaced entirely; not supported alongside the new format.                                             |

## Goals

1. The new `Updated Fund Rankings.csv` becomes the canonical upload format.
2. All metrics referenced by the scoring engine flow in (no more silently
   null inputs).
3. `Asset Type` and `Last Price` are persisted and visible in the UI.
4. Existing fund display names survive the rewrite — uploads no longer
   blank them out.
5. Uncategorized rows do not block an upload; they are skipped and
   reported.

## Non-goals

- Changes to the scoring algorithm itself (weights, formulas, blend
  logic). The new metric inputs will reach scoring through the existing
  config.
- Backfilling fund display names from a third-party source.
- A workflow to assign categories to currently-uncategorized tickers.
- Generalizing the importer to multiple CSV formats. The new format is
  the only supported one.

## Design

### A. Schema migration — `supabase/migrations/004_updated_fund_rankings_schema.sql`

Before authoring, inspect the live `fund_metrics` table (via the
Supabase MCP `list_tables`) to confirm which columns already exist. The
migration is additive only.

- `funds`: add `asset_type VARCHAR(50) DEFAULT NULL` (stable per ticker;
  e.g., "Non-Equity").
- `fund_metrics`: add `last_price DOUBLE PRECISION DEFAULT NULL` (varies
  per snapshot).
- For any of `beta_3yr`, `beta_5yr`, `std_dev_3yr`, `std_dev_5yr`,
  `kurtosis_3yr`, `kurtosis_5yr`, `skewness_3yr`, `skewness_5yr`,
  `drawdown_3yr`, `drawdown_5yr`, `downside_dev_3yr`, `downside_dev_5yr`,
  `inception_date`, `aum`, `turnover` that are missing from
  `fund_metrics`, add as `DOUBLE PRECISION DEFAULT NULL` (or `DATE` for
  `inception_date`).

No RLS policy changes — additive columns inherit existing policies. The
migration runs against a Supabase branch first.

### B. CSV importer rewrite — `frontend/lib/csv-import.ts`

#### Column map

Replace `YCHARTS_COLUMN_MAP` with `FUND_RANKINGS_COLUMN_MAP` (lowercased
header → DB column). Mapping:

| CSV header           | DB column            | Target table   |
| -------------------- | -------------------- | -------------- |
| ticker               | ticker               | both           |
| assigned category    | category             | funds          |
| asset type           | asset_type           | funds          |
| inception date       | inception_date       | fund_metrics   |
| qtd return           | return_qtd           | fund_metrics   |
| ytd return           | return_ytd           | fund_metrics   |
| 1y return            | return_1yr           | fund_metrics   |
| 3y return            | return_3yr           | fund_metrics   |
| 5y return            | return_5yr           | fund_metrics   |
| 10y return           | return_10yr          | fund_metrics   |
| cat 1y return        | benchmark_return_1yr | fund_metrics   |
| cat 3y return        | benchmark_return_3yr | fund_metrics   |
| cat 5y return        | benchmark_return_5yr | fund_metrics   |
| cat 10y return       | benchmark_return_10yr| fund_metrics   |
| fund total assets    | aum                  | fund_metrics   |
| net expense ratio    | expense_ratio        | fund_metrics   |
| turnover             | turnover             | fund_metrics   |
| last price           | last_price           | fund_metrics   |
| pe ratio             | pe                   | fund_metrics   |
| pb ratio             | pb                   | fund_metrics   |
| dividend yield       | yield_pct            | fund_metrics   |
| sharpe 3y/5y         | sharpe_3yr / 5yr     | fund_metrics   |
| sortino 3y/5y        | sortino_3yr / 5yr    | fund_metrics   |
| treynor 3y/5y        | treynor_3yr / 5yr    | fund_metrics   |
| info ratio 3y/5y     | info_ratio_3yr / 5yr | fund_metrics   |
| beta 3y/5y           | beta_3yr / 5yr       | fund_metrics   |
| std dev 3y/5y        | std_dev_3yr / 5yr    | fund_metrics   |
| tracking error 3y/5y | tracking_error_3yr / 5yr | fund_metrics |
| r-squared 3y/5y      | r_squared_3yr / 5yr  | fund_metrics   |
| alpha 3y/5y          | alpha_3yr / 5yr      | fund_metrics   |
| up capture 3y/5y     | up_capture_3yr / 5yr | fund_metrics   |
| down capture 3y/5y   | down_capture_3yr / 5yr | fund_metrics |
| max drawdown 3y/5y   | drawdown_3yr / 5yr   | fund_metrics   |
| dd dev 3y/5y         | downside_dev_3yr / 5yr | fund_metrics |
| kurtosis 3y/5y       | kurtosis_3yr / 5yr   | fund_metrics   |
| skewness 3y/5y       | skewness_3yr / 5yr   | fund_metrics   |
| batting avg 3y/5y    | batting_avg_3yr / 5yr | fund_metrics  |

Required headers (validation): `ticker`, `assigned category`.

#### Date parsing

Add `parseInceptionDate(raw: string): { value: string | null, error: string | null }`:

- Format observed: `"Oct-13-2023"` (`Mon-DD-YYYY`).
- Output: ISO `YYYY-MM-DD`.
- Blank / `N/A` / `--` → `{ value: null, error: null }`.
- Anything else → `{ value: null, error: "inception_date must be in Mon-DD-YYYY format." }`.

#### Numeric parsing

Reuse existing `parseNumber()`. It already strips `%`, `$`, `,`, and
handles `(negative)` notation, so values like `"$176,218,581"`,
`"10.24%"`, `"$30.04"` parse correctly.

#### Uncategorized rows

When `category` is empty after trimming:

- Do not push to `fundsBatch` or `metricsBatch`.
- Increment `rows_skipped`.
- Append the ticker to a local `uncategorizedTickers: string[]`.
- After the loop, if `uncategorizedTickers.length > 0`, push a single
  summary string into `result.errors`:
  `"Skipped N uncategorized rows: TICK1, TICK2, …"` (truncate to first
  20 tickers, ellipsize the rest).

This summary is informational — it does not block the upload because the
upload pipeline only blocks on `result.errors.length > 0` *after the
loop completes*. To preserve "skip but don't block" semantics, the
summary is appended *after* the validation gate, or — cleaner — added
to a new `result.warnings: string[]` field that the API surfaces in the
response and writes to `upload_log.errors`. Choose the **warnings**
path to keep validation-error semantics intact.

#### Funds-registry upsert

Build `fundsBatch` entries as `{ ticker, category, asset_type }` —
**omit `name`** entirely. With `onConflict: "ticker"`, existing rows
keep their `name` column untouched; new rows get the schema default
(`''`).

#### Metrics upsert

`metricsBatch` records carry every fund_metrics column the new CSV
covers, including the previously-unmapped ones (beta, std_dev,
kurtosis, skewness, drawdown, dd_dev) plus `inception_date`, `aum`,
`turnover`, `last_price`.

### C. API surface — `frontend/app/api/upload/route.ts`

- No signature changes; the route still expects multipart `files[]` and
  `as_of_date`.
- The new `warnings` array on `ImportResult` is surfaced in the JSON
  response alongside `errors`, and concatenated into the
  `upload_log.errors` text column (existing behavior is to join with
  newlines).

### D. UI changes

- **Fund detail panel header** (`frontend/components/...FundDetailPanel`
  or equivalent): render `Asset Type` next to the category chip when
  present.
- **RankingsGrid** (category workbench AG Grid): add a `Last Price`
  column. Right-aligned, `$0.00` formatted, default-shown, included in
  the existing column chooser so users can hide it via their saved
  preset. Reuse the existing currency formatter if one exists; otherwise
  add a tiny helper.

Inception Date, AUM, Turnover, and the new risk metrics already have
fields/columns in the existing components — they will simply start
showing real values once the importer populates them.

### E. Scoring verification

No code changes to `scoring.ts` or `scoring_config` defaults. Manual
verification steps (executed against a Supabase branch before the
migration touches production):

1. Run the migration on the branch.
2. Upload `Updated Fund Rankings.csv` via the admin upload UI using a
   chosen `as_of_date`.
3. Spot-check 2–3 funds across categories (e.g., one Large Cap Growth,
   one Alternatives, one fund with <3y history):
   - Confirm `beta_3yr`, `std_dev_3yr`, `kurtosis_3yr`, `skewness_3yr`,
     `drawdown_3yr` are populated in `fund_metrics`.
   - Recalculate rankings; confirm `risk_score` is non-null where it was
     null before.
   - Verify direction-of-effect (high std_dev + bad drawdown → lower
     risk score).
4. Confirm `total_gpa_score` is non-null for funds with full history,
   and the short-record penalty still applies to <3y funds.

## Architecture & data flow

```
Updated Fund Rankings.csv
        │
        ▼
  POST /api/upload  ──── dry-run validate ────► importCSV() (dry)
        │                                          │
        │                                  validation errors? ── yes ──► 400
        │                                          │ no
        │                                          ▼
        │                                  importCSV() (write)
        │                                          │
        │   ┌──────────────────────────────────────┴─────────────────────────┐
        │   ▼                                                                ▼
        │  funds: upsert {ticker, category, asset_type}        fund_metrics: upsert
        │   (name preserved on conflict)                       all per-snapshot cols
        │                                                      keyed (ticker, as_of_date)
        │                                                                    │
        │                                                                    ▼
        │                                                       recalculateAllRankings(asOfDate)
        │                                                                    │
        ▼                                                                    ▼
   upload_log.insert                                              writes computed scores
   (rows_total, rows_inserted, rows_skipped,                      back to funds.*_score
    errors = errors[] + warnings[])                               (per existing scoring.ts)
```

## Risk & mitigation

| Risk                                                    | Mitigation                                                                                                  |
| ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Rankings shift noticeably once new metrics flow in.     | Spot-check on a Supabase branch first; communicate the expected score-direction change before promoting.    |
| Migration assumes columns missing on `fund_metrics`.    | `list_tables` via Supabase MCP before writing the migration; only `ADD COLUMN IF NOT EXISTS` for each.      |
| Existing fund names get blanked.                        | Omit `name` from the upsert payload entirely — `onConflict: ticker` leaves the column untouched on update.  |
| Inception Date format drift (e.g., `"Oct 13, 2023"`).   | Strict `Mon-DD-YYYY` parser; non-matching values surface a row-level error.                                 |
| Uncategorized rows accidentally drop scoring inputs.    | Warning summary makes the count visible in the upload response and `upload_log`; admin can backfill later.  |

## Verification

- `npx tsc --noEmit`
- `npm run lint`
- `npm run build`
- Manual: upload `Updated Fund Rankings.csv` against the Supabase branch
  with a chosen `as_of_date`; spot-check the funds listed in section E.
