import { NextResponse } from "next/server";
import { getRankingSnapshots } from "@/lib/queries";

export async function GET() {
  try {
    const snapshots = await getRankingSnapshots();
    return NextResponse.json({ snapshots });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "unknown" },
      { status: 500 }
    );
  }
}
