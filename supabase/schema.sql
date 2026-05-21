-- Oak Bridge Fund Ranking System — Supabase (PostgreSQL) Schema
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New Query)

-- ============================================================
-- Funds table — one row per fund, UPSERT on (ticker, category)
-- ============================================================
CREATE TABLE IF NOT EXISTS funds (
  id              SERIAL PRIMARY KEY,
  ticker          VARCHAR(20)  NOT NULL,
  name            VARCHAR(255) NOT NULL DEFAULT '',
  category        VARCHAR(100) NOT NULL,

  -- General
  asset_type      VARCHAR(50)  DEFAULT NULL,
  inception_date  DATE         DEFAULT NULL,
  aum             DOUBLE PRECISION DEFAULT NULL,
  turnover        DOUBLE PRECISION DEFAULT NULL,
  expense_ratio   DOUBLE PRECISION DEFAULT NULL,
  yield_pct       DOUBLE PRECISION DEFAULT NULL,
  pe              DOUBLE PRECISION DEFAULT NULL,
  pb              DOUBLE PRECISION DEFAULT NULL,

  -- Risk metrics (3yr)
  beta_3yr            DOUBLE PRECISION DEFAULT NULL,
  r_squared_3yr       DOUBLE PRECISION DEFAULT NULL,
  up_capture_3yr      DOUBLE PRECISION DEFAULT NULL,
  down_capture_3yr    DOUBLE PRECISION DEFAULT NULL,
  sharpe_3yr          DOUBLE PRECISION DEFAULT NULL,
  tracking_error_3yr  DOUBLE PRECISION DEFAULT NULL,
  sortino_3yr         DOUBLE PRECISION DEFAULT NULL,
  treynor_3yr         DOUBLE PRECISION DEFAULT NULL,
  info_ratio_3yr      DOUBLE PRECISION DEFAULT NULL,
  kurtosis_3yr        DOUBLE PRECISION DEFAULT NULL,
  drawdown_3yr        DOUBLE PRECISION DEFAULT NULL,
  skewness_3yr        DOUBLE PRECISION DEFAULT NULL,

  -- Risk metrics (5yr)
  beta_5yr            DOUBLE PRECISION DEFAULT NULL,
  r_squared_5yr       DOUBLE PRECISION DEFAULT NULL,
  up_capture_5yr      DOUBLE PRECISION DEFAULT NULL,
  down_capture_5yr    DOUBLE PRECISION DEFAULT NULL,
  sharpe_5yr          DOUBLE PRECISION DEFAULT NULL,
  tracking_error_5yr  DOUBLE PRECISION DEFAULT NULL,
  sortino_5yr         DOUBLE PRECISION DEFAULT NULL,
  treynor_5yr         DOUBLE PRECISION DEFAULT NULL,
  info_ratio_5yr      DOUBLE PRECISION DEFAULT NULL,
  kurtosis_5yr        DOUBLE PRECISION DEFAULT NULL,
  drawdown_5yr        DOUBLE PRECISION DEFAULT NULL,
  skewness_5yr        DOUBLE PRECISION DEFAULT NULL,

  -- Return metrics
  alpha_3yr             DOUBLE PRECISION DEFAULT NULL,
  alpha_5yr             DOUBLE PRECISION DEFAULT NULL,
  return_1yr            DOUBLE PRECISION DEFAULT NULL,
  return_3yr            DOUBLE PRECISION DEFAULT NULL,
  return_5yr            DOUBLE PRECISION DEFAULT NULL,
  return_10yr           DOUBLE PRECISION DEFAULT NULL,
  return_ytd            DOUBLE PRECISION DEFAULT NULL,
  return_qtd            DOUBLE PRECISION DEFAULT NULL,
  benchmark_return_1yr  DOUBLE PRECISION DEFAULT NULL,
  benchmark_return_3yr  DOUBLE PRECISION DEFAULT NULL,
  benchmark_return_5yr  DOUBLE PRECISION DEFAULT NULL,
  benchmark_return_10yr DOUBLE PRECISION DEFAULT NULL,
  batting_avg_3yr       DOUBLE PRECISION DEFAULT NULL,
  batting_avg_5yr       DOUBLE PRECISION DEFAULT NULL,

  -- Computed scores (filled by recalculate)
  risk_score          DOUBLE PRECISION DEFAULT NULL,
  return_score        DOUBLE PRECISION DEFAULT NULL,
  market_cap_score    DOUBLE PRECISION DEFAULT NULL,
  turnover_score      DOUBLE PRECISION DEFAULT NULL,
  total_gpa_score     DOUBLE PRECISION DEFAULT NULL,
  category_rank       INT DEFAULT NULL,

  -- Risk sub-scores
  beta_score            DOUBLE PRECISION DEFAULT NULL,
  r_squared_score       DOUBLE PRECISION DEFAULT NULL,
  up_capture_score      DOUBLE PRECISION DEFAULT NULL,
  down_capture_score    DOUBLE PRECISION DEFAULT NULL,
  sharpe_score          DOUBLE PRECISION DEFAULT NULL,
  tracking_error_score  DOUBLE PRECISION DEFAULT NULL,
  sortino_score         DOUBLE PRECISION DEFAULT NULL,
  treynor_score         DOUBLE PRECISION DEFAULT NULL,
  info_ratio_score      DOUBLE PRECISION DEFAULT NULL,
  kurtosis_score        DOUBLE PRECISION DEFAULT NULL,
  drawdown_score        DOUBLE PRECISION DEFAULT NULL,
  skewness_score        DOUBLE PRECISION DEFAULT NULL,

  -- Return sub-scores
  alpha_comp_score            DOUBLE PRECISION DEFAULT NULL,
  yield_comp_score            DOUBLE PRECISION DEFAULT NULL,
  relative_return_comp_score  DOUBLE PRECISION DEFAULT NULL,
  price_comp_score            DOUBLE PRECISION DEFAULT NULL,
  fee_comp_score              DOUBLE PRECISION DEFAULT NULL,

  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE (ticker, category)
);

CREATE INDEX IF NOT EXISTS idx_funds_category ON funds (category);
CREATE INDEX IF NOT EXISTS idx_funds_gpa ON funds (category, total_gpa_score DESC);

-- ============================================================
-- Scoring config — key/value store for tunable parameters
-- ============================================================
CREATE TABLE IF NOT EXISTS scoring_config (
  config_key    VARCHAR(100) PRIMARY KEY,
  config_value  TEXT NOT NULL,
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Insert defaults
INSERT INTO scoring_config (config_key, config_value) VALUES
  ('blend_weight_3yr',     '0.4'),
  ('blend_weight_5yr',     '0.6'),
  ('short_record_penalty', '0.9'),
  ('gpa_risk_weight',      '0.5'),
  ('gpa_return_weight',    '0.5'),
  ('market_cap_divisor',   '1200'),
  ('turnover_threshold',   '50'),
  ('turnover_divisor',     '-4'),
  ('risk_weights',         '{"beta":1,"r_squared":1,"up_capture":1,"down_capture":1,"sharpe":1,"tracking_error":1,"sortino":1,"treynor":1,"info_ratio":1,"kurtosis":1,"drawdown":1,"skewness":1}'),
  ('return_weights',       '{"alpha":1,"yield":1,"relative_return":1,"price":1,"fee":1}'),
  ('relative_return_weights', '{"return_3yr":0.30,"return_5yr":0.25,"return_1yr":0.15,"return_ytd":0.10,"return_qtd":0.05,"return_10yr":0.05,"batting_avg_3yr":0.05,"batting_avg_5yr":0.05}')
ON CONFLICT (config_key) DO NOTHING;

-- ============================================================
-- Upload log — track every CSV import
-- ============================================================
CREATE TABLE IF NOT EXISTS upload_log (
  id              SERIAL PRIMARY KEY,
  filename        VARCHAR(255) NOT NULL,
  rows_total      INT NOT NULL DEFAULT 0,
  rows_inserted   INT NOT NULL DEFAULT 0,
  rows_updated    INT NOT NULL DEFAULT 0,
  rows_skipped    INT NOT NULL DEFAULT 0,
  errors          TEXT,
  uploaded_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Auto-update updated_at on funds
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS funds_updated_at ON funds;
CREATE TRIGGER funds_updated_at
  BEFORE UPDATE ON funds
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- user_release_views — per-user "release notes seen" cursor
-- (see migration 005 for full policy definitions)
-- ============================================================
CREATE TABLE IF NOT EXISTS user_release_views (
  user_id           uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  last_seen_version text NOT NULL,
  updated_at        timestamptz NOT NULL DEFAULT now()
);
