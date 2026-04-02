import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  const { data } = await supabase
    .from("funds")
    .select("category")
    .order("category");

  const categories = [...new Set((data ?? []).map((r) => r.category))];
  return NextResponse.json({ categories });
}
