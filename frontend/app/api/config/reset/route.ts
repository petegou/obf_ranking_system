import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { recalculateAllRankings } from "@/lib/scoring";

const DEFAULTS: Record<string, string> = {
  blend_weight_3yr: "0.4",
  blend_weight_5yr: "0.6",
  short_record_penalty: "0.9",
  gpa_risk_weight: "0.5",
  gpa_return_weight: "0.5",
  market_cap_divisor: "1200",
  turnover_threshold: "50",
  turnover_divisor: "-4",
  risk_weights: JSON.stringify({
    beta: 1, r_squared: 1, up_capture: 1, down_capture: 1,
    sharpe: 1, tracking_error: 1, sortino: 1, treynor: 1,
    info_ratio: 1, kurtosis: 1, drawdown: 1, skewness: 1,
  }),
  return_weights: JSON.stringify({
    alpha: 1, yield: 1, relative_return: 1, price: 1, fee: 1,
  }),
  relative_return_weights: JSON.stringify({
    return_3yr: 0.30, return_5yr: 0.25, return_1yr: 0.15,
    return_ytd: 0.10, return_qtd: 0.05, return_10yr: 0.05,
    batting_avg_3yr: 0.05, batting_avg_5yr: 0.05,
  }),
};

export async function POST() {
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

  for (const [key, value] of Object.entries(DEFAULTS)) {
    await supabase
      .from("scoring_config")
      .upsert({ config_key: key, config_value: value }, { onConflict: "config_key" });
  }

  await recalculateAllRankings();

  const config: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(DEFAULTS)) {
    try {
      config[key] = JSON.parse(value);
    } catch {
      config[key] = parseFloat(value) || value;
    }
  }
  return NextResponse.json(config);
}
