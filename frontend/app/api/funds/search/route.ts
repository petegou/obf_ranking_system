import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { resolveAsOfDate } from "@/lib/rankings-utils";

const RESULT_LIMIT = 8;

type FundSearchRow = {
  ticker: string;
  name: string;
  category: string;
};

function normalizeSearchTerm(value: string) {
  // PostgREST treats %, _, and * as LIKE wildcards. Removing them prevents a
  // user-entered symbol from broadening a search to unrelated funds.
  return value.replace(/[\\%_*]/g, "").trim();
}

function matchPriority(row: FundSearchRow, normalizedQuery: string) {
  const ticker = row.ticker.toLowerCase();
  const name = row.name.toLowerCase();

  if (ticker === normalizedQuery) return 0;
  if (ticker.startsWith(normalizedQuery)) return 1;
  if (name.startsWith(normalizedQuery)) return 2;
  return 3;
}

function mergeAndRankResults(
  resultSets: (FundSearchRow[] | null)[],
  query: string
) {
  const byTicker = new Map<string, FundSearchRow>();

  for (const row of resultSets.flatMap((rows) => rows ?? [])) {
    if (!byTicker.has(row.ticker)) byTicker.set(row.ticker, row);
  }

  const normalizedQuery = query.toLowerCase();

  return [...byTicker.values()]
    .sort((a, b) => {
      const priorityDifference =
        matchPriority(a, normalizedQuery) -
        matchPriority(b, normalizedQuery);

      return priorityDifference || a.ticker.localeCompare(b.ticker);
    })
    .slice(0, RESULT_LIMIT);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim();
  const dateParam = searchParams.get("date");

  if (q.length < 1) {
    return NextResponse.json({ results: [] });
  }

  const date = await resolveAsOfDate(dateParam);
  const searchTerm = normalizeSearchTerm(q);

  if (!searchTerm) {
    return NextResponse.json({ results: [], ...(date && { as_of_date: date }) });
  }

  const selection = date
    ? "ticker, name, category, fund_rankings!inner(as_of_date)"
    : "ticker, name, category";

  function buildQuery(column: "ticker" | "name", pattern: string) {
    let query = supabase.from("funds").select(selection);

    if (date) query = query.eq("fund_rankings.as_of_date", date);

    return query
      .ilike(column, pattern)
      .order("ticker")
      .limit(RESULT_LIMIT);
  }

  const responses = await Promise.all([
    buildQuery("ticker", `${searchTerm}%`),
    buildQuery("name", `${searchTerm}%`),
    buildQuery("name", `%${searchTerm}%`),
  ]);
  const failedResponse = responses.find(({ error }) => error);

  if (failedResponse?.error) {
    return NextResponse.json(
      { error: failedResponse.error.message },
      { status: 500 }
    );
  }

  const results = mergeAndRankResults(
    responses.map(
      ({ data }) => data as unknown as FundSearchRow[] | null
    ),
    searchTerm
  );

  return NextResponse.json({ results, ...(date && { as_of_date: date }) });
}
