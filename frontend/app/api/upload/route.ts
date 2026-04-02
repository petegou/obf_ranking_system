import { NextRequest, NextResponse } from "next/server";
import { importCSV } from "@/lib/csv-import";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  if (!file.name.toLowerCase().endsWith(".csv")) {
    return NextResponse.json(
      { error: "Only CSV files are accepted" },
      { status: 400 }
    );
  }

  const text = await file.text();
  const result = await importCSV(text, file.name);

  return NextResponse.json(result);
}
