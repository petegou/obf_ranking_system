import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { resolveAsOfDate, formatRanking } from "@/lib/rankings-utils";

export async function GET(request: NextRequest) {
  const category  = request.nextUrl.searchParams.get("category");
  const dateParam = request.nextUrl.searchParams.get("date");

  if (!category) {
    return NextResponse.json(
      { error: "category parameter is required" },
      { status: 400 }
    );
  }

  const asOfDate = await resolveAsOfDate(dateParam);
  if (!asOfDate) {
    return NextResponse.json({ error: "No rankings data available" }, { status: 404 });
  }

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
    .eq("as_of_date", asOfDate)
    .eq("funds.category", category)
    .order("category_rank", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data || data.length === 0) {
    return NextResponse.json(
      { error: `No rankings found for category '${category}' on ${asOfDate}` },
      { status: 404 }
    );
  }

  return NextResponse.json({
    category,
    as_of_date: asOfDate,
    rankings: data.map(formatRanking),
  });
}
