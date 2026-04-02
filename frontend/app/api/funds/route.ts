import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const category = request.nextUrl.searchParams.get("category");

  let query = supabase
    .from("funds")
    .select("ticker, name, category, aum, expense_ratio");

  if (category) {
    query = query.eq("category", category);
  }

  const { data, error } = await query.order("ticker");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ funds: data ?? [] });
}
