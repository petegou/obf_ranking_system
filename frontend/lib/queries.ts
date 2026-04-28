import { supabase } from "./supabase";
import {
  resolveAsOfDate,
  formatRanking,
  formatRankingSlim,
} from "./rankings-utils";

export async function getCategories(): Promise<string[]> {
  const { data, error } = await supabase
    .from("funds")
    .select("category")
    .order("category");
  if (error) throw new Error(error.message);
  return [...new Set((data ?? []).map((r) => r.category))];
}

export async function getCategoryCounts(
  asOfDate?: string | null
): Promise<Record<string, number>> {
  const date = await resolveAsOfDate(asOfDate ?? null);
  if (!date) return {};

  const { data, error } = await supabase
    .from("fund_rankings")
    .select(`ticker, funds!inner(category)`)
    .eq("as_of_date", date);
  if (error) throw new Error(error.message);

  const counts: Record<string, number> = {};
  for (const row of data ?? []) {
    const f = (row as { funds: unknown }).funds;
    const fund = Array.isArray(f) ? f[0] : f;
    const cat = (fund as { category?: string } | null)?.category;
    if (!cat) continue;
    counts[cat] = (counts[cat] ?? 0) + 1;
  }
  return counts;
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
    .order("total_gpa_score", { ascending: false });
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
    .order("category_rank", { ascending: true });
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
