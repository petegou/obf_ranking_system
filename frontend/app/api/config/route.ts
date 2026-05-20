import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { recalculateAllRankings } from "@/lib/scoring";
import {
  parseJsonError,
  validateScoringConfigPayload,
} from "@/lib/api-validation";

export async function GET() {
  const { data, error } = await supabase
    .from("scoring_config")
    .select("config_key, config_value");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const config: Record<string, unknown> = {};
  for (const row of data ?? []) {
    try {
      config[row.config_key] = JSON.parse(row.config_value);
    } catch {
      config[row.config_key] = parseFloat(row.config_value) || row.config_value;
    }
  }
  return NextResponse.json(config);
}

export async function PUT(request: NextRequest) {
  const serverSupabase = await createSupabaseServerClient();
  const { data: { user } } = await serverSupabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: roleData } = await supabase
    .from("user_roles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (roleData?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch (error: unknown) {
    return NextResponse.json({ error: parseJsonError(error) }, { status: 400 });
  }

  const validation = validateScoringConfigPayload(body);
  if (!validation.ok) {
    return NextResponse.json({ error: validation.errors.join(" ") }, { status: 400 });
  }

  for (const [key, value] of Object.entries(validation.value)) {
    const val = typeof value === "object" ? JSON.stringify(value) : String(value);
    const { error } = await supabase
      .from("scoring_config")
      .upsert({ config_key: key, config_value: val }, { onConflict: "config_key" });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  await recalculateAllRankings();

  // Return updated config
  const { data } = await supabase
    .from("scoring_config")
    .select("config_key, config_value");

  const config: Record<string, unknown> = {};
  for (const row of data ?? []) {
    try {
      config[row.config_key] = JSON.parse(row.config_value);
    } catch {
      config[row.config_key] = parseFloat(row.config_value) || row.config_value;
    }
  }
  return NextResponse.json(config);
}
