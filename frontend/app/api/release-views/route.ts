/**
 * /api/release-views — per-user "last seen release version" cursor.
 *
 * GET returns { lastSeenVersion: string | null }. `null` means no row exists
 * for this user yet (brand-new account); the client follows up with a POST
 * to seed the cursor at the current LATEST_RELEASE.version so the user
 * doesn't get a wall of historic notes on first login.
 *
 * POST inserts a row. Idempotent on conflict — if the row already exists
 * (race or repeat call) it updates `last_seen_version` to the supplied
 * value.
 *
 * PATCH advances the cursor — used when the user dismisses the auto-popup.
 */

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

function parseLastSeenVersion(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  // ISO date YYYY-MM-DD. Keep the validation cheap; the server table is
  // text, but we don't want callers persisting anything that breaks
  // lexicographic comparison with the static release-notes list.
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null;
  return trimmed;
}

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("user_release_views")
    .select("last_seen_version")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    lastSeenVersion: (data?.last_seen_version as string | undefined) ?? null,
  });
}

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const lastSeenVersion = parseLastSeenVersion(
    typeof body === "object" && body !== null
      ? Reflect.get(body, "lastSeenVersion")
      : null,
  );
  if (!lastSeenVersion) {
    return NextResponse.json(
      { error: "lastSeenVersion must be an ISO date (YYYY-MM-DD)." },
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from("user_release_views")
    .upsert(
      { user_id: user.id, last_seen_version: lastSeenVersion },
      { onConflict: "user_id" },
    )
    .select("last_seen_version")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(
    { lastSeenVersion: data.last_seen_version as string },
    { status: 201 },
  );
}

export async function PATCH(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const lastSeenVersion = parseLastSeenVersion(
    typeof body === "object" && body !== null
      ? Reflect.get(body, "lastSeenVersion")
      : null,
  );
  if (!lastSeenVersion) {
    return NextResponse.json(
      { error: "lastSeenVersion must be an ISO date (YYYY-MM-DD)." },
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from("user_release_views")
    .upsert(
      { user_id: user.id, last_seen_version: lastSeenVersion },
      { onConflict: "user_id" },
    )
    .select("last_seen_version")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    lastSeenVersion: data.last_seen_version as string,
  });
}
