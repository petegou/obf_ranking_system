import { NextRequest, NextResponse } from "next/server";
import { getAllRankings } from "@/lib/queries";

export async function GET(request: NextRequest) {
  const dateParam = request.nextUrl.searchParams.get("date");
  try {
    return NextResponse.json(await getAllRankings(dateParam));
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "unknown" },
      { status: 500 }
    );
  }
}
