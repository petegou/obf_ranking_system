import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { importCSV } from "@/lib/csv-import";
import { recalculateAllRankings } from "@/lib/scoring";

export async function POST(request: NextRequest) {
  const serverSupabase = await createSupabaseServerClient();
  const { data: { user } } = await serverSupabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: roleData } = await serverSupabase
    .from("user_roles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (roleData?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const formData = await request.formData();
  const files = formData.getAll("files") as File[];
  const asOfDate = formData.get("as_of_date") as string | null;

  if (!files || files.length === 0) {
    return NextResponse.json({ error: "No files provided" }, { status: 400 });
  }

  if (!asOfDate || !/^\d{4}-\d{2}-\d{2}$/.test(asOfDate)) {
    return NextResponse.json(
      { error: "as_of_date is required (format: YYYY-MM-DD)" },
      { status: 400 }
    );
  }

  const invalidFiles = files.filter((f) => !f.name.toLowerCase().endsWith(".csv"));
  if (invalidFiles.length > 0) {
    return NextResponse.json({ error: "Only CSV files are accepted" }, { status: 400 });
  }

  // Process all files in parallel — safe because importCSV no longer triggers scoring
  const results = await Promise.all(
    files.map(async (file) => {
      const text = await file.text();
      const result = await importCSV(text, file.name, asOfDate);
      return { filename: file.name, ...result };
    })
  );

  // Run scoring once after all files are imported
  await recalculateAllRankings(asOfDate);

  const totals = results.reduce(
    (acc, r) => ({
      rows_total:    acc.rows_total    + r.rows_total,
      rows_upserted: acc.rows_upserted + r.rows_upserted,
      rows_skipped:  acc.rows_skipped  + r.rows_skipped,
      errors:        [...acc.errors,   ...r.errors],
    }),
    { rows_total: 0, rows_upserted: 0, rows_skipped: 0, errors: [] as string[] }
  );

  return NextResponse.json({ as_of_date: asOfDate, files: results, ...totals });
}
