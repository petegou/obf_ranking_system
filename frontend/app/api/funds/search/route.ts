import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { resolveAsOfDate } from "@/lib/rankings-utils";

type RankedFundSearchRow = {
  ticker: string;
  funds:
    | { name: string; category: string }
    | { name: string; category: string }[]
    | null;
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim();
  const dateParam = searchParams.get("date");

  if (q.length < 1) {
    return NextResponse.json({ results: [] });
  }

  const date = await resolveAsOfDate(dateParam);

  if (date) {
    const { data, error } = await supabase
      .from("fund_rankings")
      .select("ticker, funds!inner(name, category)")
      .eq("as_of_date", date)
      .ilike("ticker", `${q}%`)
      .order("ticker")
      .limit(8);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const results = ((data as unknown as RankedFundSearchRow[] | null) ?? [])
      .map((row) => {
        const fund = Array.isArray(row.funds) ? row.funds[0] : row.funds;
        return {
          ticker: row.ticker,
          name: fund?.name ?? row.ticker,
          category: fund?.category ?? "",
        };
      });

    return NextResponse.json({ results, as_of_date: date });
  }

  const { data, error } = await supabase
    .from("funds")
    .select("ticker, name, category")
    .ilike("ticker", `${q}%`)
    .order("ticker")
    .limit(8);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ results: data ?? [] });
}
