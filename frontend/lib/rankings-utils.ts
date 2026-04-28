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
type FundJoin = { name: string; category: string } | { name: string; category: string }[] | null;

function pickFund(f: FundJoin): { name: string; category: string } | null {
  if (!f) return null;
  return Array.isArray(f) ? f[0] ?? null : f;
}

export interface RankingFull {
  rank: number;
  ticker: string;
  name: string;
  category: string;
  as_of_date: string;
  total_gpa_score: number;
  risk_score: number;
  return_score: number;
  market_cap_score: number;
  turnover_score: number;
  risk_breakdown: {
    beta: number;
    r_squared: number;
    up_capture: number;
    down_capture: number;
    sharpe: number;
    tracking_error: number;
    sortino: number;
    treynor: number;
    info_ratio: number;
    kurtosis: number;
    drawdown: number;
    skewness: number;
  };
  return_breakdown: {
    alpha: number;
    yield: number;
    relative_return: number;
    price: number;
    fee: number;
  };
}

export interface RankingSlim {
  rank: number;
  ticker: string;
  name: string;
  category: string;
  as_of_date: string;
  total_gpa_score: number;
  risk_score: number;
  return_score: number;
  market_cap_score: number;
  turnover_score: number;
}

const num = (v: unknown): number => (typeof v === "number" ? v : 0);
const str = (v: unknown): string => (typeof v === "string" ? v : "");

/** Full ranking shape including risk/return breakdowns. */
export function formatRanking(r: RawRanking): RankingFull {
  const fund = pickFund(r.funds as FundJoin);
  return {
    rank:             num(r.category_rank),
    ticker:           str(r.ticker),
    name:             fund?.name     ?? "",
    category:         fund?.category ?? "",
    as_of_date:       str(r.as_of_date),
    total_gpa_score:  num(r.total_gpa_score),
    risk_score:       num(r.risk_score),
    return_score:     num(r.return_score),
    market_cap_score: num(r.market_cap_score),
    turnover_score:   num(r.turnover_score),
    risk_breakdown: {
      beta:           num(r.beta_score),
      r_squared:      num(r.r_squared_score),
      up_capture:     num(r.up_capture_score),
      down_capture:   num(r.down_capture_score),
      sharpe:         num(r.sharpe_score),
      tracking_error: num(r.tracking_error_score),
      sortino:        num(r.sortino_score),
      treynor:        num(r.treynor_score),
      info_ratio:     num(r.info_ratio_score),
      kurtosis:       num(r.kurtosis_score),
      drawdown:       num(r.drawdown_score),
      skewness:       num(r.skewness_score),
    },
    return_breakdown: {
      alpha:           num(r.alpha_comp_score),
      yield:           num(r.yield_comp_score),
      relative_return: num(r.relative_return_comp_score),
      price:           num(r.price_comp_score),
      fee:             num(r.fee_comp_score),
    },
  };
}

/** Slim ranking shape (summary only, no sub-breakdowns). */
export function formatRankingSlim(r: RawRanking): RankingSlim {
  const fund = pickFund(r.funds as FundJoin);
  return {
    rank:             num(r.category_rank),
    ticker:           str(r.ticker),
    name:             fund?.name     ?? "",
    category:         fund?.category ?? "",
    as_of_date:       str(r.as_of_date),
    total_gpa_score:  num(r.total_gpa_score),
    risk_score:       num(r.risk_score),
    return_score:     num(r.return_score),
    market_cap_score: num(r.market_cap_score),
    turnover_score:   num(r.turnover_score),
  };
}
