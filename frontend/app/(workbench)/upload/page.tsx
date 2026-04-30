"use client";

import Link from "next/link";
import { useState, useRef } from "react";
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
      <div className="max-w-3xl mx-auto px-6 py-10">
        <p style={{ color: "var(--text-muted)" }}>Loading...</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-10">
        <div className="mb-6">
          <Link
            href="/"
            className="text-sm font-medium no-underline hover:underline"
            style={{ color: "var(--accent)" }}
          >
            &larr; Home
          </Link>
        </div>
        <div
          className="rounded-lg border px-6 py-8 text-center"
          style={{
            backgroundColor: "var(--card-bg)",
            borderColor: "var(--card-border)",
          }}
        >
          <h2
            className="text-xl font-semibold mb-2"
            style={{ color: "var(--foreground)" }}
          >
            Access Denied
          </h2>
          <p style={{ color: "var(--text-muted)" }}>
            You do not have permission to view this page. Only administrators can
            upload data.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <div className="mb-6">
        <Link
          href="/"
          className="text-sm font-medium no-underline hover:underline"
          style={{ color: "var(--accent)" }}
        >
          &larr; Home
        </Link>
      </div>

      <h1
        className="text-3xl font-bold mb-1"
        style={{ color: "var(--foreground)" }}
      >
        Upload Data
      </h1>
      <p className="mb-8" style={{ color: "var(--text-muted)" }}>
        Import YCharts comp_table CSV exports. Upload all 3 files at once for a
        given data date.
      </p>

      <div
        className="rounded-lg border p-6 mb-6 space-y-5"
        style={{
          backgroundColor: "var(--card-bg)",
          borderColor: "var(--card-border)",
        }}
      >
        {/* Date picker */}
        <div>
          <label
            className="block text-sm font-medium mb-2"
            style={{ color: "var(--foreground)" }}
          >
            Data Date <span style={{ color: "#dc2626" }}>*</span>
          </label>
          <input
            type="date"
            value={asOfDate}
            onChange={(e) => setAsOfDate(e.target.value)}
            className="rounded-lg border px-3 py-2 text-sm"
            style={{
              backgroundColor: "var(--card-bg)",
              borderColor: "var(--card-border)",
              color: "var(--foreground)",
            }}
          />
          <p className="mt-1 text-xs" style={{ color: "var(--text-muted)" }}>
            The date this data represents (matches the date in the filename).
          </p>
        </div>

        {/* File picker */}
        <div>
          <label
            className="block text-sm font-medium mb-2"
            style={{ color: "var(--foreground)" }}
          >
            CSV Files <span style={{ color: "#dc2626" }}>*</span>
          </label>
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
            className="text-sm"
            style={{ color: "var(--foreground)" }}
          />
          {files.length > 0 && (
            <ul className="mt-2 space-y-1">
              {files.map((f) => (
                <li key={f.name} className="text-sm" style={{ color: "var(--text-muted)" }}>
                  {f.name} ({(f.size / 1024).toFixed(1)} KB)
                </li>
              ))}
            </ul>
          )}
        </div>

        <button
          onClick={handleUpload}
          disabled={files.length === 0 || !asOfDate || uploading}
          className="px-5 py-2 rounded-lg text-sm font-semibold transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            backgroundColor: "var(--accent)",
            color: "#ffffff",
          }}
        >
          {uploading
            ? `Uploading ${files.length} file${files.length === 1 ? "" : "s"}...`
            : files.length > 0
              ? `Upload ${files.length} File${files.length === 1 ? "" : "s"}`
              : "Upload Files"}
        </button>
      </div>

      {error && (
        <div
          className="rounded-lg border px-4 py-3 mb-6 text-sm font-medium"
          style={{
            backgroundColor: "#fef2f2",
            borderColor: "#fecaca",
            color: "#dc2626",
          }}
        >
          {error}
        </div>
      )}

      {result && (
        <div
          className="rounded-lg border p-6"
          style={{
            backgroundColor: "var(--card-bg)",
            borderColor: "var(--card-border)",
          }}
        >
          <h2
            className="text-lg font-semibold mb-1"
            style={{ color: "var(--foreground)" }}
          >
            Upload Results
          </h2>
          <p className="text-sm mb-4" style={{ color: "var(--text-muted)" }}>
            Data date: {result.as_of_date}
          </p>

          {/* Totals */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            {[
              { label: "Total Rows", value: result.rows_total },
              { label: "Upserted",   value: result.rows_upserted },
              { label: "Skipped",    value: result.rows_skipped },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-lg p-3 text-center"
                style={{ backgroundColor: "var(--accent-muted)" }}
              >
                <p className="text-2xl font-bold" style={{ color: "var(--foreground)" }}>
                  {item.value}
                </p>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  {item.label}
                </p>
              </div>
            ))}
          </div>

          {/* Per-file breakdown */}
          {result.files.length > 1 && (
            <div className="mb-4 space-y-2">
              <h3 className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
                Per File
              </h3>
              {result.files.map((f) => (
                <div
                  key={f.filename}
                  className="rounded-lg border px-4 py-3 text-sm flex flex-wrap gap-4 items-center"
                  style={{ borderColor: "var(--card-border)" }}
                >
                  <span className="font-medium flex-1" style={{ color: "var(--foreground)" }}>
                    {f.filename}
                  </span>
                  <span style={{ color: "var(--text-muted)" }}>
                    {f.rows_upserted} upserted · {f.rows_skipped} skipped
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Errors */}
          {result.errors.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-2" style={{ color: "#dc2626" }}>
                Errors ({result.errors.length})
              </h3>
              <ul
                className="text-sm space-y-1 list-disc list-inside"
                style={{ color: "#dc2626" }}
              >
                {result.errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
