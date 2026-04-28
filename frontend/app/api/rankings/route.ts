import { NextRequest, NextResponse } from "next/server";
import { getRankingsForCategory } from "@/lib/queries";

export async function GET(request: NextRequest) {
  const category = request.nextUrl.searchParams.get("category");
  const dateParam = request.nextUrl.searchParams.get("date");

  if (!category) {
    return NextResponse.json(
      { error: "category parameter is required" },
      { status: 400 }
    );
  }

  try {
    const result = await getRankingsForCategory(category, dateParam);
    if (!result.as_of_date) {
      return NextResponse.json(
        { error: "No rankings data available" },
        { status: 404 }
      );
    }
    if (result.rankings.length === 0) {
      return NextResponse.json(
        { error: `No rankings found for category '${category}' on ${result.as_of_date}` },
        { status: 404 }
      );
    }
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "unknown" },
      { status: 500 }
    );
  }
}
