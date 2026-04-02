import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const category = request.nextUrl.searchParams.get("category");
  if (!category) {
    return NextResponse.json(
      { error: "category parameter is required" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("funds")
    .select(
      `category_rank, ticker, name, category,
       total_gpa_score, risk_score, return_score,
       market_cap_score, turnover_score,
       beta_score, r_squared_score, up_capture_score, down_capture_score,
       sharpe_score, tracking_error_score, sortino_score, treynor_score,
       info_ratio_score, kurtosis_score, drawdown_score, skewness_score,
       alpha_comp_score, yield_comp_score, relative_return_comp_score,
       price_comp_score, fee_comp_score`
    )
    .eq("category", category)
    .order("category_rank", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data || data.length === 0) {
    return NextResponse.json(
      { error: `Category '${category}' not found` },
      { status: 404 }
    );
  }

  const rankings = data.map((f) => formatFundScore(f));
  return NextResponse.json({ category, rankings });
}

function formatFundScore(f: Record<string, unknown>) {
  return {
    rank: f.category_rank,
    ticker: f.ticker,
    name: f.name,
    category: f.category,
    total_gpa_score: f.total_gpa_score ?? 0,
    risk_score: f.risk_score ?? 0,
    return_score: f.return_score ?? 0,
    market_cap_score: f.market_cap_score ?? 0,
    turnover_score: f.turnover_score ?? 0,
    risk_breakdown: {
      beta: f.beta_score ?? 0,
      r_squared: f.r_squared_score ?? 0,
      up_capture: f.up_capture_score ?? 0,
      down_capture: f.down_capture_score ?? 0,
      sharpe: f.sharpe_score ?? 0,
      tracking_error: f.tracking_error_score ?? 0,
      sortino: f.sortino_score ?? 0,
      treynor: f.treynor_score ?? 0,
      info_ratio: f.info_ratio_score ?? 0,
      kurtosis: f.kurtosis_score ?? 0,
      drawdown: f.drawdown_score ?? 0,
      skewness: f.skewness_score ?? 0,
    },
    return_breakdown: {
      alpha: f.alpha_comp_score ?? 0,
      yield: f.yield_comp_score ?? 0,
      relative_return: f.relative_return_comp_score ?? 0,
      price: f.price_comp_score ?? 0,
      fee: f.fee_comp_score ?? 0,
    },
  };
}
