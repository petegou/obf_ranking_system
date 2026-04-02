import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ ticker: string }> }
) {
  const { ticker } = await params;

  const { data, error } = await supabase
    .from("funds")
    .select("*")
    .ilike("ticker", ticker)
    .limit(1)
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: `Fund '${ticker}' not found` },
      { status: 404 }
    );
  }

  return NextResponse.json({
    rank: data.category_rank,
    ticker: data.ticker,
    name: data.name,
    category: data.category,
    total_gpa_score: data.total_gpa_score ?? 0,
    risk_score: data.risk_score ?? 0,
    return_score: data.return_score ?? 0,
    market_cap_score: data.market_cap_score ?? 0,
    turnover_score: data.turnover_score ?? 0,
    risk_breakdown: {
      beta: data.beta_score ?? 0,
      r_squared: data.r_squared_score ?? 0,
      up_capture: data.up_capture_score ?? 0,
      down_capture: data.down_capture_score ?? 0,
      sharpe: data.sharpe_score ?? 0,
      tracking_error: data.tracking_error_score ?? 0,
      sortino: data.sortino_score ?? 0,
      treynor: data.treynor_score ?? 0,
      info_ratio: data.info_ratio_score ?? 0,
      kurtosis: data.kurtosis_score ?? 0,
      drawdown: data.drawdown_score ?? 0,
      skewness: data.skewness_score ?? 0,
    },
    return_breakdown: {
      alpha: data.alpha_comp_score ?? 0,
      yield: data.yield_comp_score ?? 0,
      relative_return: data.relative_return_comp_score ?? 0,
      price: data.price_comp_score ?? 0,
      fee: data.fee_comp_score ?? 0,
    },
  });
}
