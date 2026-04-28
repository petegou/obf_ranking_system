import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { resolveAsOfDate } from "@/lib/rankings-utils";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ticker: string }> }
) {
  const { ticker } = await params;
  const dateParam  = request.nextUrl.searchParams.get("date");

  const asOfDate = await resolveAsOfDate(dateParam, ticker);
  if (!asOfDate) {
    return NextResponse.json({ error: `Fund '${ticker}' not found` }, { status: 404 });
  }

  const { data: fund, error: fundError } = await supabase
    .from("funds")
    .select("ticker, name, category")
    .ilike("ticker", ticker)
    .single();

  if (fundError || !fund) {
    return NextResponse.json({ error: `Fund '${ticker}' not found` }, { status: 404 });
  }

  const [{ data: ranking }, { data: metrics }] = await Promise.all([
    supabase
      .from("fund_rankings")
      .select("*")
      .eq("ticker", fund.ticker)
      .eq("as_of_date", asOfDate)
      .single(),
    supabase
      .from("fund_metrics")
      .select("*")
      .eq("ticker", fund.ticker)
      .eq("as_of_date", asOfDate)
      .single(),
  ]);

  return NextResponse.json({
    ticker:           fund.ticker,
    name:             fund.name,
    category:         fund.category,
    as_of_date:       asOfDate,
    rank:             ranking?.category_rank    ?? null,
    total_gpa_score:  ranking?.total_gpa_score  ?? null,
    risk_score:       ranking?.risk_score       ?? null,
    return_score:     ranking?.return_score     ?? null,
    market_cap_score: ranking?.market_cap_score ?? null,
    turnover_score:   ranking?.turnover_score   ?? null,
    risk_breakdown: {
      beta:           ranking?.beta_score           ?? null,
      r_squared:      ranking?.r_squared_score      ?? null,
      up_capture:     ranking?.up_capture_score     ?? null,
      down_capture:   ranking?.down_capture_score   ?? null,
      sharpe:         ranking?.sharpe_score         ?? null,
      tracking_error: ranking?.tracking_error_score ?? null,
      sortino:        ranking?.sortino_score        ?? null,
      treynor:        ranking?.treynor_score        ?? null,
      info_ratio:     ranking?.info_ratio_score     ?? null,
      kurtosis:       ranking?.kurtosis_score       ?? null,
      drawdown:       ranking?.drawdown_score       ?? null,
      skewness:       ranking?.skewness_score       ?? null,
    },
    return_breakdown: {
      alpha:           ranking?.alpha_comp_score           ?? null,
      yield:           ranking?.yield_comp_score           ?? null,
      relative_return: ranking?.relative_return_comp_score ?? null,
      price:           ranking?.price_comp_score           ?? null,
      fee:             ranking?.fee_comp_score             ?? null,
    },
    metrics: metrics ?? null,
  });
}
