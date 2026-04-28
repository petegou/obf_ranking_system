import { supabase } from "./supabase";

/**
 * Resolve the as_of_date to use for a rankings query.
 * If dateParam is provided it's used directly; otherwise the latest available date
 * in fund_rankings is returned (optionally scoped to a specific ticker).
 * Returns null if no rankings exist yet.
 */
export async function resolveAsOfDate(
  dateParam: string | null,
  tickerFilter?: string
): Promise<string | null> {
  if (dateParam) return dateParam;

  let query = supabase
    .from("fund_rankings")
    .select("as_of_date")
    .order("as_of_date", { ascending: false })
    .limit(1);

  if (tickerFilter) {
    query = query.eq("ticker", tickerFilter.toUpperCase());
  }

  const { data } = await query.single();
  return data?.as_of_date ?? null;
}

type RawRanking = Record<string, unknown>;
type FundJoin = { name: string; category: string } | null;

/** Full ranking shape including risk/return breakdowns. */
export function formatRanking(r: RawRanking) {
  const fund = r.funds as FundJoin;
  return {
    rank:             r.category_rank,
    ticker:           r.ticker,
    name:             fund?.name     ?? "",
    category:         fund?.category ?? "",
    as_of_date:       r.as_of_date,
    total_gpa_score:  r.total_gpa_score  ?? 0,
    risk_score:       r.risk_score       ?? 0,
    return_score:     r.return_score     ?? 0,
    market_cap_score: r.market_cap_score ?? 0,
    turnover_score:   r.turnover_score   ?? 0,
    risk_breakdown: {
      beta:           r.beta_score           ?? 0,
      r_squared:      r.r_squared_score      ?? 0,
      up_capture:     r.up_capture_score     ?? 0,
      down_capture:   r.down_capture_score   ?? 0,
      sharpe:         r.sharpe_score         ?? 0,
      tracking_error: r.tracking_error_score ?? 0,
      sortino:        r.sortino_score        ?? 0,
      treynor:        r.treynor_score        ?? 0,
      info_ratio:     r.info_ratio_score     ?? 0,
      kurtosis:       r.kurtosis_score       ?? 0,
      drawdown:       r.drawdown_score       ?? 0,
      skewness:       r.skewness_score       ?? 0,
    },
    return_breakdown: {
      alpha:           r.alpha_comp_score           ?? 0,
      yield:           r.yield_comp_score           ?? 0,
      relative_return: r.relative_return_comp_score ?? 0,
      price:           r.price_comp_score           ?? 0,
      fee:             r.fee_comp_score             ?? 0,
    },
  };
}

/** Slim ranking shape (summary only, no sub-breakdowns). */
export function formatRankingSlim(r: RawRanking) {
  const fund = r.funds as FundJoin;
  return {
    rank:             r.category_rank,
    ticker:           r.ticker,
    name:             fund?.name     ?? "",
    category:         fund?.category ?? "",
    as_of_date:       r.as_of_date,
    total_gpa_score:  r.total_gpa_score  ?? 0,
    risk_score:       r.risk_score       ?? 0,
    return_score:     r.return_score     ?? 0,
    market_cap_score: r.market_cap_score ?? 0,
    turnover_score:   r.turnover_score   ?? 0,
  };
}
