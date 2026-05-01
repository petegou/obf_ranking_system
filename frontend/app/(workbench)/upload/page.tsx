"use client";

import { useState, useRef } from "react";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth-context";

interface FileResult {
  filename: string;
  rows_total: number;
  rows_upserted: number;
  rows_skipped: number;
  errors: string[];
}

interface UploadResult {
  as_of_date: string;
  files: FileResult[];
  rows_total: number;
  rows_upserted: number;
  rows_skipped: number;
  errors: string[];
}

export default function UploadPage() {
  const { isAdmin, loading: authLoading } = useAuth();
  const [files, setFiles] = useState<File[]>([]);
  const [asOfDate, setAsOfDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async () => {
    if (files.length === 0 || !asOfDate) return;

    setUploading(true);
    setResult(null);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("as_of_date", asOfDate);
      for (const file of files) {
        formData.append("files", file);
      }

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Upload failed");
      }

      setResult(data);
      setFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="mx-auto max-w-5xl px-8 py-8">
        <p className="text-sm text-[var(--text-secondary)]">Loading...</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-5xl px-8 py-8">
        <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-card)] px-6 py-8 text-center shadow-sm">
          <h2 className="mb-2 text-xl font-semibold text-[var(--text-primary)]">
            Access Denied
          </h2>
          <p className="text-sm text-[var(--text-secondary)]">
            You do not have permission to view this page. Only administrators can
            upload data.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 px-8 py-8">
      <header>
        <h1 className="text-xl font-semibold tracking-tight text-[var(--text-primary)]">
          Upload Data
        </h1>
        <p className="mt-0.5 text-sm text-[var(--text-tertiary)]">
          Import YCharts comp_table CSV exports for a selected data date.
        </p>
      </header>

      <section className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-card)] p-6 shadow-sm">
        <div className="mb-5 border-b border-[var(--border-subtle)] pb-4">
          <h2 className="text-base font-semibold text-[var(--text-primary)]">
            Import files
          </h2>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Upload all three CSV files together so the rankings share the same
            as-of date.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-[220px_1fr]">
          <label className="text-sm font-medium text-[var(--text-primary)]">
            Data Date <span className="text-[var(--score-weak)]">*</span>
          </label>
          <div>
            <Input
              type="date"
              value={asOfDate}
              onChange={(e) => setAsOfDate(e.target.value)}
              className="h-9 w-fit min-w-44 border-[var(--border-default)] bg-[var(--surface-card)] text-[var(--text-primary)]"
            />
            <p className="mt-1.5 text-xs text-[var(--text-tertiary)]">
              The date this data represents, matching the date in the filename.
            </p>
          </div>

          <label className="text-sm font-medium text-[var(--text-primary)]">
            CSV Files <span className="text-[var(--score-weak)]">*</span>
          </label>
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              multiple
              onChange={(e) => {
                setFiles(Array.from(e.target.files ?? []));
                setResult(null);
                setError(null);
              }}
              className="block w-full rounded-md border border-[var(--border-default)] bg-[var(--surface-card)] px-2.5 py-2 text-sm text-[var(--text-primary)] file:mr-3 file:rounded-md file:border-0 file:bg-[var(--surface-muted)] file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-[var(--text-primary)]"
            />
            {files.length > 0 && (
              <ul className="mt-3 divide-y divide-[var(--border-subtle)] rounded-md border border-[var(--border-subtle)]">
                {files.map((f) => (
                  <li
                    key={f.name}
                    className="flex items-center justify-between gap-3 px-3 py-2 text-sm"
                  >
                    <span className="min-w-0 truncate text-[var(--text-primary)]">
                      {f.name}
                    </span>
                    <span className="shrink-0 font-mono text-xs text-[var(--text-tertiary)]">
                      {(f.size / 1024).toFixed(1)} KB
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <Button
          onClick={handleUpload}
          disabled={files.length === 0 || !asOfDate || uploading}
          className="mt-6 bg-[var(--brand-primary)] text-white hover:bg-[var(--brand-primary)]/90"
        >
          <Upload />
          {uploading
            ? `Uploading ${files.length} file${files.length === 1 ? "" : "s"}...`
            : files.length > 0
              ? `Upload ${files.length} File${files.length === 1 ? "" : "s"}`
              : "Upload Files"}
        </Button>
      </section>

      {error && (
        <div className="rounded-lg border border-[var(--score-weak)]/20 bg-[var(--score-weak)]/10 px-4 py-3 text-sm font-medium text-[var(--score-weak)]">
          {error}
        </div>
      )}

      {result && (
        <section className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-card)] p-6 shadow-sm">
          <h2 className="text-base font-semibold text-[var(--text-primary)]">
            Upload Results
          </h2>
          <p className="mb-4 mt-1 text-sm text-[var(--text-secondary)]">
            Data date: {result.as_of_date}
          </p>

          {/* Totals */}
          <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {[
              { label: "Total Rows", value: result.rows_total },
              { label: "Upserted",   value: result.rows_upserted },
              { label: "Skipped",    value: result.rows_skipped },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-md border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-3 text-center"
              >
                <p className="text-2xl font-semibold tabular-nums text-[var(--text-primary)]">
                  {item.value}
                </p>
                <p className="text-xs text-[var(--text-tertiary)]">
                  {item.label}
                </p>
              </div>
            ))}
          </div>

          {/* Per-file breakdown */}
          {result.files.length > 1 && (
            <div className="mb-4 space-y-2">
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                Per File
              </h3>
              {result.files.map((f) => (
                <div
                  key={f.filename}
                  className="flex flex-wrap items-center gap-4 rounded-md border border-[var(--border-subtle)] px-4 py-3 text-sm"
                >
                  <span className="min-w-0 flex-1 truncate font-medium text-[var(--text-primary)]">
                    {f.filename}
                  </span>
                  <span className="text-[var(--text-secondary)]">
                    {f.rows_upserted} upserted / {f.rows_skipped} skipped
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Errors */}
          {result.errors.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-semibold text-[var(--score-weak)]">
                Errors ({result.errors.length})
              </h3>
              <ul className="list-inside list-disc space-y-1 text-sm text-[var(--score-weak)]">
                {result.errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
