import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { resolveAsOfDate, formatRankingSlim } from "@/lib/rankings-utils";

export async function GET(request: NextRequest) {
  const dateParam = request.nextUrl.searchParams.get("date");

  const asOfDate = await resolveAsOfDate(dateParam);
  if (!asOfDate) {
    return NextResponse.json({ total: 0, rankings: [], as_of_date: null });
  }

  const { data, error } = await supabase
    .from("fund_rankings")
    .select(
      `category_rank, as_of_date, ticker,
       total_gpa_score, risk_score, return_score,
       market_cap_score, turnover_score,
       funds!inner(name, category)`
    )
    .eq("as_of_date", asOfDate)
    .order("total_gpa_score", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    total:      (data ?? []).length,
    as_of_date: asOfDate,
    rankings:   (data ?? []).map(formatRankingSlim),
  });
}
