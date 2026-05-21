import { supabase } from "./supabase";
import {
  resolveAsOfDate,
  formatRanking,
  formatRankingSlim,
} from "./rankings-utils";

// Supabase JS defaults to a 1000-row range. Some project API settings still cap
// single responses, so overview helpers page through rows where full coverage matters.
const MAX_ROWS = 50000;
const OVERVIEW_PAGE_SIZE = 1000;

export interface CategoryWithCount {
  category: string;
  count: number;
  level_1: string | null;
  level_2: string | null;
  level_3: string | null;
  level_4: string | null;
}

/**
 * Fetch categories and their fund counts for the given as-of date in a single
 * query against the category_counts view. Returns categories sorted by name,
 * with Level 1–4 hierarchy metadata for sidebar grouping.
 */
export async function getCategoriesWithCounts(
  asOfDate?: string | null
): Promise<CategoryWithCount[]> {
  const date = await resolveAsOfDate(asOfDate ?? null);
  if (!date) return [];

  const { data, error } = await supabase
    .from("category_counts")
    .select("category, fund_count, level_1, level_2, level_3, level_4")
    .eq("as_of_date", date)
    .order("category");
  if (error) throw new Error(error.message);

  return (data ?? []).map((r) => ({
    category: r.category,
    count: r.fund_count,
    level_1: r.level_1 ?? null,
    level_2: r.level_2 ?? null,
    level_3: r.level_3 ?? null,
    level_4: r.level_4 ?? null,
  }));
}

/** Distinct categories that have rankings, sorted by name. */
export async function getCategories(asOfDate?: string | null): Promise<string[]> {
  const rows = await getCategoriesWithCounts(asOfDate);
  return rows.map((r) => r.category);
}

export async function getAllRankings(asOfDate?: string | null) {
  const date = await resolveAsOfDate(asOfDate ?? null);
  if (!date) return { total: 0, as_of_date: null, rankings: [] };

  const { data, error } = await supabase
    .from("fund_rankings")
    .select(
      `category_rank, as_of_date, ticker,
       total_gpa_score, risk_score, return_score,
       market_cap_score, turnover_score,
       funds!inner(name, category)`
    )
    .eq("as_of_date", date)
    .order("total_gpa_score", { ascending: false })
    .limit(MAX_ROWS);
  if (error) throw new Error(error.message);

  return {
    total: (data ?? []).length,
    as_of_date: date,
    rankings: (data ?? []).map(formatRankingSlim),
  };
}

export async function getRankingsForCategory(
  category: string,
  asOfDate?: string | null
) {
  const date = await resolveAsOfDate(asOfDate ?? null);
  if (!date) return { category, as_of_date: null, rankings: [] };

  const { data, error } = await supabase
    .from("fund_rankings")
    .select(
      `category_rank, as_of_date, ticker,
       total_gpa_score, risk_score, return_score,
       market_cap_score, turnover_score,
       beta_score, r_squared_score, up_capture_score, down_capture_score,
       sharpe_score, tracking_error_score, sortino_score, treynor_score,
       info_ratio_score, kurtosis_score, drawdown_score, skewness_score,
       alpha_comp_score, yield_comp_score, relative_return_comp_score,
       price_comp_score, fee_comp_score,
       funds!inner(name, category)`
    )
    .eq("as_of_date", date)
    .eq("funds.category", category)
    .order("category_rank", { ascending: true })
    .limit(MAX_ROWS);
  if (error) throw new Error(error.message);

  const rankings = (data ?? []).map(formatRanking);
  const tickers = rankings.map((r) => r.ticker).filter(Boolean);
  const { data: metrics, error: metricsError } = tickers.length > 0
    ? await supabase
        .from("fund_metrics")
        .select("*")
        .eq("as_of_date", date)
        .in("ticker", tickers)
    : { data: [], error: null };
  if (metricsError) throw new Error(metricsError.message);

  const metricsByTicker = new Map(
    ((metrics as Record<string, unknown>[] | null) ?? []).map((row) => [
      String(row.ticker ?? ""),
      row,
    ])
  );

  return {
    category,
    as_of_date: date,
    rankings: rankings.map((ranking) => ({
      ...ranking,
      metrics: metricsByTicker.get(ranking.ticker) ?? {},
    })),
  };
}

export async function getFundDetail(ticker: string, asOfDate?: string | null) {
  const date = await resolveAsOfDate(asOfDate ?? null, ticker);
  if (!date) return null;

  const { data: fund } = await supabase
    .from("funds")
    .select("ticker, name, category, asset_type")
    .ilike("ticker", ticker)
    .single();
  if (!fund) return null;

  const [{ data: ranking }, { data: metrics }] = await Promise.all([
    supabase
      .from("fund_rankings")
      .select("*")
      .eq("ticker", fund.ticker)
      .eq("as_of_date", date)
      .single(),
    supabase
      .from("fund_metrics")
      .select("*")
      .eq("ticker", fund.ticker)
      .eq("as_of_date", date)
      .single(),
  ]);

  return {
    ticker: fund.ticker,
    name: fund.name,
    category: fund.category,
    asset_type: (fund as { asset_type?: string | null }).asset_type ?? null,
    as_of_date: date,
    rank: ranking?.category_rank ?? null,
    total_gpa_score: ranking?.total_gpa_score ?? null,
    risk_score: ranking?.risk_score ?? null,
    return_score: ranking?.return_score ?? null,
    market_cap_score: ranking?.market_cap_score ?? null,
    turnover_score: ranking?.turnover_score ?? null,
    risk_breakdown: {
      beta: ranking?.beta_score ?? null,
      r_squared: ranking?.r_squared_score ?? null,
      up_capture: ranking?.up_capture_score ?? null,
      down_capture: ranking?.down_capture_score ?? null,
      sharpe: ranking?.sharpe_score ?? null,
      tracking_error: ranking?.tracking_error_score ?? null,
      sortino: ranking?.sortino_score ?? null,
      treynor: ranking?.treynor_score ?? null,
      info_ratio: ranking?.info_ratio_score ?? null,
      kurtosis: ranking?.kurtosis_score ?? null,
      drawdown: ranking?.drawdown_score ?? null,
      skewness: ranking?.skewness_score ?? null,
    },
    return_breakdown: {
      alpha: ranking?.alpha_comp_score ?? null,
      yield: ranking?.yield_comp_score ?? null,
      relative_return: ranking?.relative_return_comp_score ?? null,
      price: ranking?.price_comp_score ?? null,
      fee: ranking?.fee_comp_score ?? null,
    },
    metrics: metrics ?? null,
  };
}

export interface OverviewKpis {
  totalFunds: number;
  categoryCount: number;
  avgGpaScore: number;
  pctScoringSeventyOrAbove: number;
  asOfDate: string | null;
}

export interface OverviewScoreDistribution {
  label: string;
  min: number | null;
  max: number | null;
  count: number;
  percent: number;
}

export interface OverviewCategorySummary {
  category: string;
  fundCount: number;
  avgGpaScore: number;
  medianGpaScore: number;
  maxGpaScore: number;
  leaderTicker: string;
  leaderName: string;
  scoringSeventyOrAbove: number;
  scoreSpread: number;
}

export interface OverviewReviewCandidate {
  ticker: string;
  name: string;
  category: string;
  totalGpaScore: number;
  riskScore: number;
  returnScore: number;
  marketCapScore: number;
  turnoverScore: number;
  reasonLabel: string;
}

export interface OverviewDecisionDashboard {
  distribution: OverviewScoreDistribution[];
  categories: OverviewCategorySummary[];
  candidates: OverviewReviewCandidate[];
}

interface OverviewRankingRow {
  ticker: string;
  name: string;
  category: string;
  totalGpaScore: number;
  riskScore: number;
  returnScore: number;
  marketCapScore: number;
  turnoverScore: number;
}

type OverviewRankingQueryRow = {
  ticker: string;
  total_gpa_score: number | null;
  risk_score: number | null;
  return_score: number | null;
  market_cap_score: number | null;
  turnover_score: number | null;
  funds: { name: string; category: string } | { name: string; category: string }[] | null;
};

async function getOverviewRankingRows(
  date: string
): Promise<OverviewRankingRow[]> {
  const rows: OverviewRankingRow[] = [];

  for (let from = 0; ; from += OVERVIEW_PAGE_SIZE) {
    const to = from + OVERVIEW_PAGE_SIZE - 1;
    const { data, error } = await supabase
      .from("fund_rankings")
      .select(
        `ticker,
         total_gpa_score,
         risk_score,
         return_score,
         market_cap_score,
         turnover_score,
         funds!inner(name, category)`
      )
      .eq("as_of_date", date)
      .order("ticker", { ascending: true })
      .range(from, to);
    if (error) throw new Error(error.message);

    const page = ((data as unknown as OverviewRankingQueryRow[] | null) ?? []);
    for (const row of page) {
      const fund = Array.isArray(row.funds) ? row.funds[0] : row.funds;
      if (!fund?.category) continue;
      rows.push({
        ticker: row.ticker,
        name: fund.name || row.ticker,
        category: fund.category,
        totalGpaScore: row.total_gpa_score ?? 0,
        riskScore: row.risk_score ?? 0,
        returnScore: row.return_score ?? 0,
        marketCapScore: row.market_cap_score ?? 0,
        turnoverScore: row.turnover_score ?? 0,
      });
    }

    if (page.length < OVERVIEW_PAGE_SIZE) return rows;
  }
}

export async function getOverviewKpis(): Promise<OverviewKpis> {
  const date = await resolveAsOfDate(null);
  if (!date) {
    return {
      totalFunds: 0,
      categoryCount: 0,
      avgGpaScore: 0,
      pctScoringSeventyOrAbove: 0,
      asOfDate: null,
    };
  }

  const rows = await getOverviewRankingRows(date);
  const categories = new Set<string>();
  let scoreSum = 0;
  let scoreSeventy = 0;

  for (const row of rows) {
    scoreSum += row.totalGpaScore;
    if (row.totalGpaScore >= 70) scoreSeventy += 1;
    categories.add(row.category);
  }

  return {
    totalFunds: rows.length,
    categoryCount: categories.size,
    avgGpaScore: rows.length > 0 ? scoreSum / rows.length : 0,
    pctScoringSeventyOrAbove:
      rows.length > 0 ? (scoreSeventy / rows.length) * 100 : 0,
    asOfDate: date,
  };
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const midpoint = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[midpoint];
  return (sorted[midpoint - 1] + sorted[midpoint]) / 2;
}

function buildOverviewDistribution(
  rows: OverviewRankingRow[]
): OverviewScoreDistribution[] {
  const bands = [
    { label: "80+", min: 80, max: null },
    { label: "70-79", min: 70, max: 80 },
    { label: "60-69", min: 60, max: 70 },
    { label: "<60", min: null, max: 60 },
  ];

  return bands.map((band) => {
    const count = rows.filter((row) => {
      const aboveMin = band.min === null || row.totalGpaScore >= band.min;
      const belowMax = band.max === null || row.totalGpaScore < band.max;
      return aboveMin && belowMax;
    }).length;

    return {
      ...band,
      count,
      percent: rows.length > 0 ? (count / rows.length) * 100 : 0,
    };
  });
}

function buildOverviewCategorySummaries(
  rows: OverviewRankingRow[]
): OverviewCategorySummary[] {
  const rowsByCategory = new Map<string, OverviewRankingRow[]>();

  for (const row of rows) {
    const categoryRows = rowsByCategory.get(row.category) ?? [];
    categoryRows.push(row);
    rowsByCategory.set(row.category, categoryRows);
  }

  return Array.from(rowsByCategory.entries())
    .map(([category, categoryRows]) => {
      const scores = categoryRows.map((row) => row.totalGpaScore);
      const leader = [...categoryRows].sort(
        (a, b) => b.totalGpaScore - a.totalGpaScore
      )[0];
      const minScore = Math.min(...scores);
      const maxScore = Math.max(...scores);

      return {
        category,
        fundCount: categoryRows.length,
        avgGpaScore:
          scores.reduce((sum, score) => sum + score, 0) / categoryRows.length,
        medianGpaScore: median(scores),
        maxGpaScore: maxScore,
        leaderTicker: leader?.ticker ?? "",
        leaderName: leader?.name ?? "",
        scoringSeventyOrAbove: categoryRows.filter(
          (row) => row.totalGpaScore >= 70
        ).length,
        scoreSpread: maxScore - minScore,
      };
    })
    .sort((a, b) => b.avgGpaScore - a.avgGpaScore);
}

function buildOverviewReviewCandidates(
  rows: OverviewRankingRow[]
): OverviewReviewCandidate[] {
  const candidates = new Map<string, OverviewReviewCandidate>();

  const addCandidates = (
    reasonLabel: string,
    rankedRows: OverviewRankingRow[],
    limit: number
  ) => {
    let added = 0;
    for (const row of rankedRows) {
      if (candidates.has(row.ticker)) continue;
      candidates.set(row.ticker, { ...row, reasonLabel });
      added += 1;
      if (added >= limit) return;
    }
  };

  addCandidates(
    "Highest GPA",
    [...rows].sort((a, b) => b.totalGpaScore - a.totalGpaScore),
    3
  );
  addCandidates(
    "Return with risk support",
    rows
      .filter((row) => row.returnScore >= 70 && row.riskScore >= 50)
      .sort(
        (a, b) =>
          b.returnScore + b.riskScore + b.totalGpaScore -
          (a.returnScore + a.riskScore + a.totalGpaScore)
      ),
    3
  );
  addCandidates(
    "Turnover penalty to review",
    rows
      .filter((row) => row.totalGpaScore >= 55 && row.turnoverScore < 0)
      .sort((a, b) => a.turnoverScore - b.turnoverScore),
    3
  );
  addCandidates(
    "Balanced risk/return",
    rows
      .filter((row) => row.riskScore >= 65 && row.returnScore >= 60)
      .sort(
        (a, b) =>
          b.riskScore + b.returnScore - (a.riskScore + a.returnScore)
      ),
    3
  );

  return Array.from(candidates.values()).slice(0, 8);
}

export async function getOverviewDecisionDashboard(): Promise<OverviewDecisionDashboard> {
  const date = await resolveAsOfDate(null);
  if (!date) return { distribution: [], categories: [], candidates: [] };
  const rows = await getOverviewRankingRows(date);

  return {
    distribution: buildOverviewDistribution(rows),
    categories: buildOverviewCategorySummaries(rows),
    candidates: buildOverviewReviewCandidates(rows),
  };
}

export interface FundScatterRow {
  ticker: string;
  name: string;
  category: string;
  riskScore: number;
  returnScore: number;
  totalGpaScore: number;
  marketCapScore: number;
}

export async function getAllFundsForScatter(): Promise<FundScatterRow[]> {
  const date = await resolveAsOfDate(null);
  if (!date) return [];

  const { data, error } = await supabase
    .from("fund_rankings")
    .select(
      `ticker,
       risk_score,
       return_score,
       total_gpa_score,
       market_cap_score,
       funds!inner(name, category)`
    )
    .eq("as_of_date", date)
    .limit(MAX_ROWS);
  if (error) throw new Error(error.message);

  type Row = {
    ticker: string;
    risk_score: number | null;
    return_score: number | null;
    total_gpa_score: number | null;
    market_cap_score: number | null;
    funds: { name: string; category: string } | { name: string; category: string }[] | null;
  };

  return ((data as unknown as Row[] | null) ?? []).map((r) => {
    const fund = Array.isArray(r.funds) ? r.funds[0] : r.funds;

    return {
      ticker: r.ticker,
      name: fund?.name ?? r.ticker,
      category: fund?.category ?? "",
      riskScore: r.risk_score ?? 0,
      returnScore: r.return_score ?? 0,
      totalGpaScore: r.total_gpa_score ?? 0,
      marketCapScore: r.market_cap_score ?? 0,
    };
  });
}

export interface PeerMetric {
  label: string;
  fundValue: number;
  categoryAverage: number;
}

export interface FundPeerStats {
  ticker: string;
  category: string;
  metrics: PeerMetric[];
}

export async function getFundPeerStats(
  ticker: string
): Promise<FundPeerStats | null> {
  const date = await resolveAsOfDate(null, ticker);
  if (!date) return null;

  const { data: fund } = await supabase
    .from("funds")
    .select("ticker, category")
    .ilike("ticker", ticker)
    .single();
  if (!fund) return null;

  const { data, error } = await supabase
    .from("fund_rankings")
    .select(
      `ticker,
       risk_score,
       return_score,
       market_cap_score,
       turnover_score,
       total_gpa_score,
       funds!inner(category)`
    )
    .eq("as_of_date", date)
    .eq("funds.category", fund.category)
    .limit(MAX_ROWS);
  if (error) throw new Error(error.message);

  type Row = {
    ticker: string;
    risk_score: number | null;
    return_score: number | null;
    market_cap_score: number | null;
    turnover_score: number | null;
    total_gpa_score: number | null;
  };

  type MetricKey = Exclude<keyof Row, "ticker">;

  const rows = ((data as unknown as Row[] | null) ?? []);
  const me = rows.find((r) => r.ticker === fund.ticker);
  if (!me) return null;

  const avg = (key: MetricKey): number => {
    const vals = rows
      .map((r) => r[key])
      .filter((v): v is number => typeof v === "number");
    if (vals.length === 0) return 0;
    return vals.reduce((sum, value) => sum + value, 0) / vals.length;
  };

  const metrics: PeerMetric[] = [
    {
      label: "Risk",
      fundValue: me.risk_score ?? 0,
      categoryAverage: avg("risk_score"),
    },
    {
      label: "Return",
      fundValue: me.return_score ?? 0,
      categoryAverage: avg("return_score"),
    },
    {
      label: "Market Cap",
      fundValue: me.market_cap_score ?? 0,
      categoryAverage: avg("market_cap_score"),
    },
    {
      label: "Turnover",
      fundValue: me.turnover_score ?? 0,
      categoryAverage: avg("turnover_score"),
    },
    {
      label: "GPA",
      fundValue: me.total_gpa_score ?? 0,
      categoryAverage: avg("total_gpa_score"),
    },
  ];

  return { ticker: fund.ticker, category: fund.category, metrics };
}

export interface HighestPerCategoryRow {
  category: string;
  ticker: string;
  name: string;
  totalGpaScore: number;
}

export async function getHighestPerCategory(): Promise<HighestPerCategoryRow[]> {
  const date = await resolveAsOfDate(null);
  if (!date) return [];

  const { data, error } = await supabase
    .from("fund_rankings")
    .select(
      `ticker,
       category_rank,
       total_gpa_score,
       funds!inner(name, category)`
    )
    .eq("as_of_date", date)
    .eq("category_rank", 1)
    .limit(MAX_ROWS);
  if (error) throw new Error(error.message);

  type Row = {
    ticker: string;
    total_gpa_score: number | null;
    funds: { name: string; category: string } | { name: string; category: string }[] | null;
  };

  return ((data as unknown as Row[] | null) ?? [])
    .map((row) => {
      const fund = Array.isArray(row.funds) ? row.funds[0] : row.funds;
      if (!fund) return null;

      return {
        category: fund.category,
        ticker: row.ticker,
        name: fund.name,
        totalGpaScore: row.total_gpa_score ?? 0,
      };
    })
    .filter((row): row is HighestPerCategoryRow => row !== null)
    .sort((a, b) => a.category.localeCompare(b.category));
}
