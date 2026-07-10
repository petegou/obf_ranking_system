import { NextRequest, NextResponse } from "next/server";
import { getCategoriesWithCounts } from "@/lib/queries";

export async function GET(request: NextRequest) {
  const dateParam = request.nextUrl.searchParams.get("date");

  try {
    const categories = await getCategoriesWithCounts(dateParam);
    return NextResponse.json({ categories });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "unknown" },
      { status: 500 }
    );
  }
}
