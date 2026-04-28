import { NextRequest, NextResponse } from "next/server";
import { getFundDetail } from "@/lib/queries";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ticker: string }> }
) {
  const { ticker } = await params;
  const dateParam = request.nextUrl.searchParams.get("date");

  try {
    const fund = await getFundDetail(ticker, dateParam);
    if (!fund) {
      return NextResponse.json(
        { error: `Fund '${ticker}' not found` },
        { status: 404 }
      );
    }
    return NextResponse.json(fund);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "unknown" },
      { status: 500 }
    );
  }
}
