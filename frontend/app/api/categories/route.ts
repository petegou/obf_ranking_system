import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  const { data, error } = await supabase
    .from("funds")
    .select("category")
    .order("category");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const categories = [...new Set((data ?? []).map((r) => r.category))];
  return NextResponse.json({ categories });
}
