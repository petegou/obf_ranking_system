import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

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
  if (value === undefined) return undefined;
  return typeof value === "string" ? value.trim() : "";
}

function normalizeColumnIds(value: unknown) {
  if (value === undefined) return undefined;
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

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body: unknown = await request.json();
  const name = normalizeName(
    typeof body === "object" && body !== null ? Reflect.get(body, "name") : undefined,
  );
  const visibleColumnIds = normalizeColumnIds(
    typeof body === "object" && body !== null
      ? Reflect.get(body, "visibleColumnIds")
      : undefined,
  );
  const isDefault =
    typeof body === "object" && body !== null
      ? Reflect.get(body, "isDefault")
      : undefined;

  if (name !== undefined && !name) {
    return NextResponse.json({ error: "Preset name is required." }, { status: 400 });
  }

  if (visibleColumnIds !== undefined && visibleColumnIds.length === 0) {
    return NextResponse.json(
      { error: "Select at least one column before saving a preset." },
      { status: 400 },
    );
  }

  if (isDefault === true) {
    const { error } = await supabase
      .from("category_column_presets")
      .update({ is_default: false })
      .eq("user_id", user.id)
      .eq("is_default", true)
      .neq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  const updates: Record<string, string | string[] | boolean> = {};
  if (name !== undefined) updates.name = name;
  if (visibleColumnIds !== undefined) {
    updates.visible_column_ids = visibleColumnIds;
  }
  if (typeof isDefault === "boolean") updates.is_default = isDefault;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No preset changes provided." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("category_column_presets")
    .update(updates)
    .eq("id", id)
    .eq("user_id", user.id)
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

  return NextResponse.json({ preset: toPreset(data as PresetRow) });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { error } = await supabase
    .from("category_column_presets")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
