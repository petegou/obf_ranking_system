import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { supabase as supabaseAdmin } from "@/lib/supabase";
import { importCSV } from "@/lib/csv-import";
import { recalculateAllRankings } from "@/lib/scoring";
import {
  validateCsvUploadFiles,
  validateIsoDate,
} from "@/lib/api-validation";

export async function POST(request: NextRequest) {
  const serverSupabase = await createSupabaseServerClient();
  const { data: { user } } = await serverSupabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: roleData } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (roleData?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const formData = await request.formData();
  const files = formData.getAll("files").filter((item): item is File => item instanceof File);
  const rawAsOfDate = formData.get("as_of_date");

  const dateError = validateIsoDate(rawAsOfDate, "as_of_date");
  if (dateError || typeof rawAsOfDate !== "string") {
    return NextResponse.json(
      { error: dateError ?? "as_of_date is required (format: YYYY-MM-DD)." },
      { status: 400 }
    );
  }
  const asOfDate = rawAsOfDate;

  const fileErrors = validateCsvUploadFiles(files);
  if (fileErrors.length > 0) {
    return NextResponse.json({ error: fileErrors.join(" ") }, { status: 400 });
  }

  const fileTexts = await Promise.all(
    files.map(async (file) => ({
      file,
      text: await file.text(),
    })),
  );

  const validationResults = await Promise.all(
    fileTexts.map(async ({ file, text }) => {
      const result = await importCSV(text, file.name, asOfDate, { dryRun: true });
      return { filename: file.name, ...result };
    })
  );

  const validationErrors = validationResults.flatMap((result) => result.errors);
  if (validationErrors.length > 0) {
    return NextResponse.json(
      {
        error: "Upload validation failed. No data was imported and no rankings were recalculated.",
        as_of_date: asOfDate,
        files: validationResults,
        rows_total: validationResults.reduce((sum, result) => sum + result.rows_total, 0),
        rows_upserted: 0,
        rows_skipped: validationResults.reduce((sum, result) => sum + result.rows_skipped, 0),
        errors: validationErrors,
      },
      { status: 400 },
    );
  }

  // Process all files in parallel — safe because importCSV no longer triggers scoring
  const results = await Promise.all(
    fileTexts.map(async ({ file, text }) => {
      const result = await importCSV(text, file.name, asOfDate);
      return { filename: file.name, ...result };
    })
  );

  const importErrors = results.flatMap((result) => result.errors);
  if (importErrors.length > 0) {
    return NextResponse.json(
      {
        error: "Upload validation failed. No rankings were recalculated.",
        as_of_date: asOfDate,
        files: results,
        rows_total: results.reduce((sum, result) => sum + result.rows_total, 0),
        rows_upserted: results.reduce((sum, result) => sum + result.rows_upserted, 0),
        rows_skipped: results.reduce((sum, result) => sum + result.rows_skipped, 0),
        errors: importErrors,
      },
      { status: 400 },
    );
  }

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
