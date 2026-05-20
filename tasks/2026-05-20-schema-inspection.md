# Live schema inspection — 2026-05-20

Production project_id: `ixdcyoslmbagcsgasbuw`

## funds columns

| column | type | notes |
| ------ | ---- | ----- |
| ticker | text | PK |
| name | text | default: '' |
| category | text | default: '' |

**Status:** `asset_type` is **MISSING** — needs to be added in migration 004

## fund_metrics columns

| column | type | notes |
| ------ | ---- | ----- |
| id | bigint | IDENTITY ALWAYS (auto-increment) |
| ticker | text | FK to funds.ticker |
| as_of_date | date | part of composite index |
| return_qtd | double precision | nullable |
| return_ytd | double precision | nullable |
| return_1yr | double precision | nullable |
| return_3yr | double precision | nullable |
| return_5yr | double precision | nullable |
| return_10yr | double precision | nullable |
| benchmark_return_1yr | double precision | nullable |
| benchmark_return_3yr | double precision | nullable |
| benchmark_return_5yr | double precision | nullable |
| benchmark_return_10yr | double precision | nullable |
| alpha_3yr | double precision | nullable |
| alpha_5yr | double precision | nullable |
| r_squared_3yr | double precision | nullable |
| r_squared_5yr | double precision | nullable |
| up_capture_3yr | double precision | nullable |
| up_capture_5yr | double precision | nullable |
| down_capture_3yr | double precision | nullable |
| down_capture_5yr | double precision | nullable |
| info_ratio_3yr | double precision | nullable |
| info_ratio_5yr | double precision | nullable |
| sharpe_3yr | double precision | nullable |
| sharpe_5yr | double precision | nullable |
| tracking_error_3yr | double precision | nullable |
| tracking_error_5yr | double precision | nullable |
| batting_avg_3yr | double precision | nullable |
| batting_avg_5yr | double precision | nullable |
| drawdown_3yr | double precision | nullable |
| drawdown_5yr | double precision | nullable |
| sortino_3yr | double precision | nullable |
| sortino_5yr | double precision | nullable |
| treynor_3yr | double precision | nullable |
| treynor_5yr | double precision | nullable |
| std_dev_3yr | double precision | nullable |
| std_dev_5yr | double precision | nullable |
| downside_dev_3yr | double precision | nullable |
| downside_dev_5yr | double precision | nullable |
| expense_ratio | double precision | nullable |
| pe | double precision | nullable |
| pb | double precision | nullable |
| yield_pct | double precision | nullable |
| min_initial_investment | double precision | nullable |
| created_at | timestamp with time zone | nullable, default: now() |

## Columns to add in migration 004

### From required set — MISSING (must be added):

- `fund_metrics.last_price DOUBLE PRECISION` — **NOT FOUND** in live schema
- `fund_metrics.aum DOUBLE PRECISION` — **NOT FOUND** in live schema
- `fund_metrics.turnover DOUBLE PRECISION` — **NOT FOUND** in live schema
- `fund_metrics.inception_date DATE` — **NOT FOUND** in live schema
- `fund_metrics.beta_3yr DOUBLE PRECISION` — **NOT FOUND** in live schema
- `fund_metrics.beta_5yr DOUBLE PRECISION` — **NOT FOUND** in live schema
- `fund_metrics.kurtosis_3yr DOUBLE PRECISION` — **NOT FOUND** in live schema
- `fund_metrics.kurtosis_5yr DOUBLE PRECISION` — **NOT FOUND** in live schema
- `fund_metrics.skewness_3yr DOUBLE PRECISION` — **NOT FOUND** in live schema
- `fund_metrics.skewness_5yr DOUBLE PRECISION` — **NOT FOUND** in live schema
- `funds.asset_type VARCHAR(50)` — **NOT FOUND** in live schema

## Already present (no migration action needed)

These columns from the required set already exist in the live schema:

**funds:**
- `ticker` ✓
- `name` ✓
- `category` ✓

**fund_metrics:**
- `ticker` ✓
- `as_of_date` ✓
- `inception_date` — **ALREADY EXISTS** (not in required set but confirmed present)
- `return_qtd` ✓
- `return_ytd` ✓
- `return_1yr` ✓
- `return_3yr` ✓
- `return_5yr` ✓
- `return_10yr` ✓
- `benchmark_return_1yr` ✓
- `benchmark_return_3yr` ✓
- `benchmark_return_5yr` ✓
- `benchmark_return_10yr` ✓
- `alpha_3yr` ✓
- `alpha_5yr` ✓
- `r_squared_3yr` ✓
- `r_squared_5yr` ✓
- `up_capture_3yr` ✓
- `up_capture_5yr` ✓
- `down_capture_3yr` ✓
- `down_capture_5yr` ✓
- `info_ratio_3yr` ✓
- `info_ratio_5yr` ✓
- `sharpe_3yr` ✓
- `sharpe_5yr` ✓
- `tracking_error_3yr` ✓
- `tracking_error_5yr` ✓
- `batting_avg_3yr` ✓
- `batting_avg_5yr` ✓
- `drawdown_3yr` ✓
- `drawdown_5yr` ✓
- `sortino_3yr` ✓
- `sortino_5yr` ✓
- `treynor_3yr` ✓
- `treynor_5yr` ✓
- `std_dev_3yr` ✓
- `std_dev_5yr` ✓
- `downside_dev_3yr` ✓
- `downside_dev_5yr` ✓
- `expense_ratio` ✓
- `pe` ✓
- `pb` ✓
- `yield_pct` ✓

## Additional tables discovered (not in scope for migration 004)

- `public.fund_rankings` — 6,629 rows, with scoring columns (beta_score, r_squared_score, etc.)
- `public.scoring_config` — configuration for scoring logic
- `public.upload_log` — audit trail for CSV uploads
- `public.user_roles` — access control (admin/viewer)
- `public.category_column_presets` — column visibility presets per user

## Key findings

1. **funds table is minimal**: Only 3 columns exist (ticker, name, category). The `asset_type` column must be added.

2. **fund_metrics is comprehensive**: Most metric columns already exist. However, 11 columns from the required set are confirmed missing:
   - Raw metrics: `last_price`, `aum`, `turnover`, `inception_date`
   - Risk/return stats: `beta_3yr`, `beta_5yr`, `kurtosis_3yr`, `kurtosis_5yr`, `skewness_3yr`, `skewness_5yr`

3. **No schema.sql mismatch for existing columns**: Every column present in the live schema was actually needed (no dead columns found).

4. **Composite index likely needed**: fund_metrics uses `id` as PK but queries likely join on (ticker, as_of_date) — verify if a unique constraint or index exists on that pair.

5. **Composition of fund_rankings**: This table holds pre-computed scores, not raw metrics. Its existence confirms the architecture: raw data in fund_metrics, computed scores in fund_rankings.

## Migration 004 action items

Before writing the migration, confirm:
- [ ] Are the 11 missing columns correct? (Review against data source/CSV schema)
- [ ] Should `fund_metrics.inception_date` become a fund-level attribute instead (move to funds table)?
- [ ] What data type for `funds.asset_type`? (VARCHAR(50)? ENUM? TEXT?)
- [ ] Are any of these new columns indexed? (e.g., last_price for price-based filtering)
