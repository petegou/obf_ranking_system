"use client";

import Link from "next/link";
import { useState, useRef } from "react";
import { useAuth } from "@/lib/auth-context";

interface UploadResult {
  rows_total: number;
  rows_inserted: number;
  rows_updated: number;
  rows_skipped: number;
  errors: string[];
}

export default function UploadPage() {
  const { isAdmin, loading: authLoading } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setResult(null);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Upload failed");
      }

      setResult(data);
      setFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
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
        Import fund data from a CSV file. This will insert new records and update
        existing ones.
      </p>

      <div
        className="rounded-lg border p-6 mb-6"
        style={{
          backgroundColor: "var(--card-bg)",
          borderColor: "var(--card-border)",
        }}
      >
        <label
          className="block text-sm font-medium mb-2"
          style={{ color: "var(--foreground)" }}
        >
          Select CSV File
        </label>
        <div className="flex items-center gap-4">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={(e) => {
              setFile(e.target.files?.[0] ?? null);
              setResult(null);
              setError(null);
            }}
            className="text-sm flex-1"
            style={{ color: "var(--foreground)" }}
          />
          <button
            onClick={handleUpload}
            disabled={!file || uploading}
            className="px-5 py-2 rounded-lg text-sm font-semibold transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              backgroundColor: "var(--accent)",
              color: "#ffffff",
            }}
          >
            {uploading ? "Uploading..." : "Upload"}
          </button>
        </div>
        {file && (
          <p className="mt-2 text-sm" style={{ color: "var(--text-muted)" }}>
            Selected: {file.name} ({(file.size / 1024).toFixed(1)} KB)
          </p>
        )}
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
            className="text-lg font-semibold mb-4"
            style={{ color: "var(--foreground)" }}
          >
            Upload Results
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
            {[
              { label: "Total Rows", value: result.rows_total },
              { label: "Inserted", value: result.rows_inserted },
              { label: "Updated", value: result.rows_updated },
              { label: "Skipped", value: result.rows_skipped },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-lg p-3 text-center"
                style={{ backgroundColor: "var(--accent-muted)" }}
              >
                <p
                  className="text-2xl font-bold"
                  style={{ color: "var(--foreground)" }}
                >
                  {item.value}
                </p>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  {item.label}
                </p>
              </div>
            ))}
          </div>
          {result.errors.length > 0 && (
            <div>
              <h3
                className="text-sm font-semibold mb-2"
                style={{ color: "#dc2626" }}
              >
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
