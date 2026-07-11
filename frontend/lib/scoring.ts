/**
 * Scoring engine — reads fund_metrics, normalizes within category,
 * writes scores to fund_rankings.
 */

import { supabase } from "./supabase";
import { percentileRank } from "./normalize";

// ---------- Types ----------

interface ScoringConfig {
  blend_weight_3yr: number;
  blend_weight_5yr: number;
  short_record_penalty: number;
  gpa_risk_weight: number;
  gpa_return_weight: number;
  market_cap_divisor: number;
  turnover_threshold: number;
  turnover_divisor: number;
  risk_weights: Record<string, number>;
  return_weights: Record<string, number>;
  relative_return_weights: Record<string, number>;
}

type FundRow = Record<string, unknown>;

const MARKET_CAP_SCORE_CAP = 10;

// ---------- Risk metric definitions ----------

const RISK_METRICS: [string, string, string, boolean][] = [
  ["beta_3yr",          "beta_5yr",          "beta",           false],
  ["r_squared_3yr",     "r_squared_5yr",     "r_squared",      true],
  ["up_capture_3yr",    "up_capture_5yr",    "up_capture",     true],
  ["down_capture_3yr",  "down_capture_5yr",  "down_capture",   false],
  ["sharpe_3yr",        "sharpe_5yr",        "sharpe",         true],
  ["tracking_error_3yr","tracking_error_5yr","tracking_error", false],
  ["sortino_3yr",       "sortino_5yr",       "sortino",        true],
  ["treynor_3yr",       "treynor_5yr",       "treynor",        true],
  ["info_ratio_3yr",    "info_ratio_5yr",    "info_ratio",     true],
  ["kurtosis_3yr",      "kurtosis_5yr",      "kurtosis",       false],
  ["drawdown_3yr",      "drawdown_5yr",      "drawdown",       false],
  ["skewness_3yr",      "skewness_5yr",      "skewness",       true],
];

const RELATIVE_RETURN_METRICS: Record<string, [string, string | null]> = {
  return_3yr:      ["return_3yr",      "benchmark_return_3yr"],
  return_5yr:      ["return_5yr",      "benchmark_return_5yr"],
  return_1yr:      ["return_1yr",      "benchmark_return_1yr"],
  return_ytd:      ["return_ytd",      null],
  return_qtd:      ["return_qtd",      null],
  return_10yr:     ["return_10yr",     "benchmark_return_10yr"],
  batting_avg_3yr: ["batting_avg_3yr", null],
  batting_avg_5yr: ["batting_avg_5yr", null],
};

// ---------- Helpers ----------

function num(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return isNaN(n) ? null : n;
}

function blend(
  v3: number | null,
  v5: number | null,
  cfg: ScoringConfig
): number | null {
  if (v3 !== null && v5 !== null)
    return v3 * cfg.blend_weight_3yr + v5 * cfg.blend_weight_5yr;
  if (v3 !== null) return v3 * cfg.short_record_penalty;
  if (v5 !== null) return v5;
  return null;
}

function col(funds: FundRow[], key: string): (number | null)[] {
  return funds.map((f) => num(f[key]));
}

function weightedAvg(
  components: Record<string, (number | null)[]>,
  weights: Record<string, number>,
  i: number
): number | null {
  let wsum = 0;
  let tw = 0;
  for (const [key, scores] of Object.entries(components)) {
    const val = scores[i];
    if (val !== null) {
      const w = weights[key] ?? 1;
      wsum += val * w;
      tw += w;
    }
  }
  return tw > 0 ? wsum / tw : null;
}

function r4(v: number | null): number {
  return v !== null ? Math.round(v * 10000) / 10000 : 0;
}

// ---------- Load config ----------

export async function loadConfig(): Promise<ScoringConfig> {
  const { data } = await supabase
    .from("scoring_config")
    .select("config_key, config_value");

  const raw: Record<string, string> = {};
  for (const row of data ?? []) {
    raw[row.config_key] = row.config_value;
  }

  const json = (key: string, def: Record<string, number>) => {
    try {
      return JSON.parse(raw[key]);
    } catch {
      return def;
    }
  };

  return {
    blend_weight_3yr:     parseFloat(raw.blend_weight_3yr)     || 0.4,
    blend_weight_5yr:     parseFloat(raw.blend_weight_5yr)     || 0.6,
    short_record_penalty: parseFloat(raw.short_record_penalty) || 0.9,
    gpa_risk_weight:      parseFloat(raw.gpa_risk_weight)      || 0.5,
    gpa_return_weight:    parseFloat(raw.gpa_return_weight)    || 0.5,
    market_cap_divisor:   parseFloat(raw.market_cap_divisor)   || 1200,
    turnover_threshold:   parseFloat(raw.turnover_threshold)   || 50,
    turnover_divisor:     parseFloat(raw.turnover_divisor)     || -4,
    risk_weights:             json("risk_weights",             {}),
    return_weights:           json("return_weights",           {}),
    relative_return_weights:  json("relative_return_weights",  {}),
  };
}

// ---------- Main recalculation ----------

export async function recalculateAllRankings(asOfDate?: string): Promise<void> {
  if (!asOfDate) {
    // PostgREST caps at 1000 rows; page through fund_metrics to discover
    // every distinct as_of_date across all snapshots (a config change
    // triggers an all-dates recalc, so missing a snapshot here would
    // silently leave it on stale scores).
    const DATE_PAGE_SIZE = 1000;
    const distinctSet = new Set<string>();
    for (let from = 0; ; from += DATE_PAGE_SIZE) {
      const to = from + DATE_PAGE_SIZE - 1;
      const { data: page, error } = await supabase
        .from("fund_metrics")
        .select("as_of_date")
        .order("as_of_date", { ascending: true })
        .range(from, to);
      if (error) throw new Error(error.message);
      if (!page || page.length === 0) break;
      for (const r of page) {
        if (r.as_of_date) distinctSet.add(r.as_of_date);
      }
      if (page.length < DATE_PAGE_SIZE) break;
    }
    for (const date of distinctSet) {
      await recalculateAllRankings(date);
    }
    return;
  }

  const cfg = await loadConfig();

  // Get distinct categories for this date.
  //
  // PostgREST caps responses at 1000 rows by default. With 6,700+ metrics
  // rows per snapshot, an unbounded SELECT silently truncates and we lose
  // categories whose funds happen to fall outside the first page — which is
  // exactly the bug that left 15 of 23 categories unscored on the 2026-05-20
  // upload. Page through the result set explicitly. Mirrors the pattern in
  // getOverviewRankingRows().
  const CATEGORY_PAGE_SIZE = 1000;
  const categoriesSet = new Set<string>();
  for (let from = 0; ; from += CATEGORY_PAGE_SIZE) {
    const to = from + CATEGORY_PAGE_SIZE - 1;
    const { data: page, error } = await supabase
      .from("fund_metrics")
      .select("ticker, funds(category)")
      .eq("as_of_date", asOfDate)
      .order("ticker", { ascending: true })
      .range(from, to);
    if (error) throw new Error(error.message);
    if (!page || page.length === 0) break;
    for (const r of page) {
      const cat = (r.funds as unknown as { category?: string } | null)?.category;
      if (cat) categoriesSet.add(cat);
    }
    if (page.length < CATEGORY_PAGE_SIZE) break;
  }
  const categories = [...categoriesSet];

  for (const category of categories) {
    // Load all metrics + fund info for this category + date. Today's
    // largest category sits at ~660 funds, well under the 1000-row cap,
    // but page anyway so we don't quietly truncate the day a single
    // category crosses that threshold.
    const PER_CATEGORY_PAGE_SIZE = 1000;
    type MetricRow = Record<string, unknown> & {
      funds: { ticker: string; name: string; category: string };
    };
    const rows: MetricRow[] = [];
    for (let from = 0; ; from += PER_CATEGORY_PAGE_SIZE) {
      const to = from + PER_CATEGORY_PAGE_SIZE - 1;
      const { data: page, error } = await supabase
        .from("fund_metrics")
        .select("*, funds!inner(ticker, name, category)")
        .eq("as_of_date", asOfDate)
        .eq("funds.category", category)
        .order("ticker")
        .range(from, to);
      if (error) throw new Error(error.message);
      if (!page || page.length === 0) break;
      rows.push(...(page as unknown as MetricRow[]));
      if (page.length < PER_CATEGORY_PAGE_SIZE) break;
    }

    if (rows.length === 0) continue;
    const n = rows.length;

    // Flatten: merge fund_metrics fields with fund registry fields
    const funds: FundRow[] = rows.map((r) => ({
      ...r,
      ticker: (r.funds as { ticker: string }).ticker,
      category: (r.funds as { category: string }).category,
    }));

    // ---- Risk sub-components ----
    const riskComp: Record<string, (number | null)[]> = {};
    for (const [col3, col5, key, higherBetter] of RISK_METRICS) {
      const blended = funds.map((f) => blend(num(f[col3]), num(f[col5]), cfg));
      riskComp[key] = percentileRank(blended, !higherBetter);
    }

    const riskScores: (number | null)[] = [];
    for (let i = 0; i < n; i++) {
      riskScores.push(weightedAvg(riskComp, cfg.risk_weights, i));
    }

    // ---- Return sub-components ----
    const alphaBlended = funds.map((f) =>
      blend(num(f.alpha_3yr), num(f.alpha_5yr), cfg)
    );
    const alphaScores = percentileRank(alphaBlended);
    const yieldScores = percentileRank(col(funds, "yield_pct"));

    const rrNorm: Record<string, (number | null)[]> = {};
    for (const [rrKey, [fundCol, benchCol]] of Object.entries(
      RELATIVE_RETURN_METRICS
    )) {
      const vals: (number | null)[] = funds.map((f) => {
        const fv = num(f[fundCol]);
        if (fv === null) return null;
        if (benchCol) {
          const bv = num(f[benchCol]);
          if (bv !== null) return fv - bv;
        }
        return fv;
      });
      rrNorm[rrKey] = percentileRank(vals);
    }

    const rrScores: (number | null)[] = [];
    for (let i = 0; i < n; i++) {
      rrScores.push(weightedAvg(rrNorm, cfg.relative_return_weights, i));
    }

    const peNorm = percentileRank(col(funds, "pe"), true);
    const pbNorm = percentileRank(col(funds, "pb"), true);
    const priceScores: (number | null)[] = funds.map((_, i) => {
      const vals = [peNorm[i], pbNorm[i]].filter((v) => v !== null) as number[];
      return vals.length > 0
        ? vals.reduce((a, b) => a + b, 0) / vals.length
        : null;
    });

    const feeScores = percentileRank(col(funds, "expense_ratio"), true);

    const retComponents: Record<string, (number | null)[]> = {
      alpha:           alphaScores,
      yield:           yieldScores,
      relative_return: rrScores,
      price:           priceScores,
      fee:             feeScores,
    };

    const returnScores: (number | null)[] = [];
    for (let i = 0; i < n; i++) {
      returnScores.push(weightedAvg(retComponents, cfg.return_weights, i));
    }

    // ---- Market cap & turnover (nullable — score 0 if missing) ----
    const mktScores = funds.map((f) => {
      const aum = num(f.aum);
      const aumInMillions = aum !== null ? aum / 1_000_000 : null;
      return aumInMillions !== null
        ? Math.min(aumInMillions / cfg.market_cap_divisor, MARKET_CAP_SCORE_CAP)
        : 0;
    });

    const turnScores = funds.map((f) => {
      const to = num(f.turnover);
      const turnoverPct = to !== null && Math.abs(to) <= 1 ? to * 100 : to;
      if (turnoverPct === null || turnoverPct <= cfg.turnover_threshold) return 0;
      return turnoverPct / cfg.turnover_divisor;
    });

    // ---- Final GPA ----
    const gpaTotal = 1;
    const gpaScores = funds.map((_, i) => {
      const rs  = riskScores[i]   ?? 0;
      const ret = returnScores[i] ?? 0;
      return (
        (rs * cfg.gpa_risk_weight + ret * cfg.gpa_return_weight) / gpaTotal +
        mktScores[i] +
        turnScores[i]
      );
    });

    // ---- Rank ----
    const indices = Array.from({ length: n }, (_, i) => i);
    indices.sort((a, b) => gpaScores[b] - gpaScores[a]);
    const ranks = new Array(n);
    indices.forEach((idx, pos) => { ranks[idx] = pos + 1; });

    // ---- Write to fund_rankings (single batched upsert per category) ----
    const rankingRows = funds.map((_, i) => ({
      ticker:                     funds[i].ticker,
      as_of_date:                 asOfDate,
      risk_score:                 r4(riskScores[i]),
      return_score:               r4(returnScores[i]),
      market_cap_score:           r4(mktScores[i]),
      turnover_score:             r4(turnScores[i]),
      total_gpa_score:            r4(gpaScores[i]),
      category_rank:              ranks[i],
      beta_score:                 r4(riskComp.beta[i]),
      r_squared_score:            r4(riskComp.r_squared[i]),
      up_capture_score:           r4(riskComp.up_capture[i]),
      down_capture_score:         r4(riskComp.down_capture[i]),
      sharpe_score:               r4(riskComp.sharpe[i]),
      tracking_error_score:       r4(riskComp.tracking_error[i]),
      sortino_score:              r4(riskComp.sortino[i]),
      treynor_score:              r4(riskComp.treynor[i]),
      info_ratio_score:           r4(riskComp.info_ratio[i]),
      kurtosis_score:             r4(riskComp.kurtosis[i]),
      drawdown_score:             r4(riskComp.drawdown[i]),
      skewness_score:             r4(riskComp.skewness[i]),
      alpha_comp_score:           r4(alphaScores[i]),
      yield_comp_score:           r4(yieldScores[i]),
      relative_return_comp_score: r4(rrScores[i]),
      price_comp_score:           r4(priceScores[i]),
      fee_comp_score:             r4(feeScores[i]),
    }));

    const { error } = await supabase
      .from("fund_rankings")
      .upsert(rankingRows, { onConflict: "ticker,as_of_date" });
    if (error) throw new Error(error.message);
  }
}
