import { supabase } from "./supabase";
import {
  resolveAsOfDate,
  formatRanking,
  formatRankingSlim,
} from "./rankings-utils";

// Supabase JS defaults to a 1000-row range. Bump well above current dataset (~6.6k).
const MAX_ROWS = 50000;

/**
 * Fetch categories and their fund counts for the given as-of date in a single
 * query against the category_counts view. Returns categories sorted by name.
 */
export async function getCategoriesWithCounts(
  asOfDate?: string | null
): Promise<{ category: string; count: number }[]> {
  const date = await resolveAsOfDate(asOfDate ?? null);
  if (!date) return [];

  const { data, error } = await supabase
    .from("category_counts")
    .select("category, fund_count")
    .eq("as_of_date", date)
    .order("category");
  if (error) throw new Error(error.message);

  return (data ?? []).map((r) => ({ category: r.category, count: r.fund_count }));
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

  return {
    category,
    as_of_date: date,
    rankings: (data ?? []).map(formatRanking),
  };
}

export async function getFundDetail(ticker: string, asOfDate?: string | null) {
  const date = await resolveAsOfDate(asOfDate ?? null, ticker);
  if (!date) return null;

  const { data: fund } = await supabase
    .from("funds")
    .select("ticker, name, category")
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

  const { data, error } = await supabase
    .from("fund_rankings")
    .select("total_gpa_score, funds!inner(category)")
    .eq("as_of_date", date)
    .limit(MAX_ROWS);
  if (error) throw new Error(error.message);

  type Row = {
    total_gpa_score: number | null;
    funds: { category: string } | { category: string }[] | null;
  };

  const rows = ((data as unknown as Row[] | null) ?? []);
  const total = rows.length;
  const categories = new Set<string>();
  let scoreSum = 0;
  let scoreSeventy = 0;

  for (const r of rows) {
    const score = r.total_gpa_score ?? 0;
    scoreSum += score;
    if (score >= 70) scoreSeventy += 1;
    const fund = Array.isArray(r.funds) ? r.funds[0] : r.funds;
    if (fund?.category) categories.add(fund.category);
  }

  return {
    totalFunds: total,
    categoryCount: categories.size,
    avgGpaScore: total > 0 ? scoreSum / total : 0,
    pctScoringSeventyOrAbove: total > 0 ? (scoreSeventy / total) * 100 : 0,
    asOfDate: date,
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
