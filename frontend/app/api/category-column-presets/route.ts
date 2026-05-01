import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

const SCHEMA_VERSION = 1;

type PresetRow = {
  id: string;
  name: string;
  schema_version: number;
  visible_column_ids: string[];
  is_default: boolean;
  created_at: string;
  updated_at: string;
};

function normalizeName(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeColumnIds(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function isUniqueViolation(error: { code?: string; message?: string }) {
  return (
    error.code === "23505" ||
    error.message?.toLowerCase().includes("duplicate key")
  );
}

function toPreset(row: PresetRow) {
  return {
    id: row.id,
    name: row.name,
    schemaVersion: row.schema_version,
    visibleColumnIds: row.visible_column_ids,
    isDefault: row.is_default,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
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
    .from("category_column_presets")
    .select(
      "id, name, schema_version, visible_column_ids, is_default, created_at, updated_at",
    )
    .eq("user_id", user.id)
    .order("is_default", { ascending: false })
    .order("name", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    presets: ((data ?? []) as PresetRow[]).map(toPreset),
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

  const body: unknown = await request.json();
  const name = normalizeName(
    typeof body === "object" && body !== null ? Reflect.get(body, "name") : null,
  );
  const visibleColumnIds = normalizeColumnIds(
    typeof body === "object" && body !== null
      ? Reflect.get(body, "visibleColumnIds")
      : null,
  );
  const isDefault =
    typeof body === "object" && body !== null
      ? Reflect.get(body, "isDefault") === true
      : false;

  if (!name) {
    return NextResponse.json({ error: "Preset name is required." }, { status: 400 });
  }

  if (visibleColumnIds.length === 0) {
    return NextResponse.json(
      { error: "Select at least one column before saving a preset." },
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from("category_column_presets")
    .insert({
      user_id: user.id,
      name,
      schema_version: SCHEMA_VERSION,
      visible_column_ids: visibleColumnIds,
      is_default: false,
    })
    .select(
      "id, name, schema_version, visible_column_ids, is_default, created_at, updated_at",
    )
    .single();

  if (error) {
    const message = isUniqueViolation(error)
      ? "A preset with that name already exists."
      : error.message;
    return NextResponse.json({ error: message }, { status: 400 });
  }

  if (!isDefault) {
    return NextResponse.json({ preset: toPreset(data as PresetRow) }, { status: 201 });
  }

  const preset = data as PresetRow;
  const { error: clearDefaultError } = await supabase
    .from("category_column_presets")
    .update({ is_default: false })
    .eq("user_id", user.id)
    .eq("is_default", true)
    .neq("id", preset.id);

  if (clearDefaultError) {
    return NextResponse.json({ error: clearDefaultError.message }, { status: 500 });
  }

  const { data: defaultData, error: defaultError } = await supabase
    .from("category_column_presets")
    .update({ is_default: true })
    .eq("id", preset.id)
    .eq("user_id", user.id)
    .select(
      "id, name, schema_version, visible_column_ids, is_default, created_at, updated_at",
    )
    .single();

  if (defaultError) {
    return NextResponse.json({ error: defaultError.message }, { status: 500 });
  }

  return NextResponse.json(
    { preset: toPreset(defaultData as PresetRow) },
    { status: 201 },
  );
}
