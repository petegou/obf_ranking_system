import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  const { data, error } = await supabase
    .from("funds")
    .select(
      `category_rank, ticker, name, category,
       total_gpa_score, risk_score, return_score,
       market_cap_score, turnover_score`
    )
    .order("total_gpa_score", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    total: data?.length ?? 0,
    rankings: data ?? [],
  });
}
