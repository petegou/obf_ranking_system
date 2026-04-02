"use client";

import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";

interface ScoringConfig {
  blend_weight_3yr: number;
  blend_weight_5yr: number;
  short_record_penalty: number;
  risk_weights: Record<string, number>;
  return_weights: Record<string, number>;
  relative_return_weights: Record<string, number>;
  market_cap_divisor: number;
  turnover_threshold: number;
  turnover_divisor: number;
  gpa_risk_weight: number;
  gpa_return_weight: number;
}

const RISK_LABELS: Record<string, string> = {
  beta: "Beta (lower = less market risk)",
  r_squared: "R-Squared (higher = better benchmark fit)",
  up_capture: "Up Capture (higher = more upside participation)",
  down_capture: "Down Capture (lower = better downside protection)",
  sharpe: "Sharpe Ratio (higher = better risk-adjusted return)",
  tracking_error: "Tracking Error (lower = tighter benchmark tracking)",
  sortino: "Sortino Ratio (higher = better downside risk-adjusted return)",
  treynor: "Treynor Ratio (higher = better systematic risk-adjusted return)",
  info_ratio: "Information Ratio (higher = better active management)",
  kurtosis: "Kurtosis (lower = fewer tail risk events)",
  drawdown: "Max Drawdown (less negative = better)",
  skewness: "Skewness (positive skew preferred)",
};

const RETURN_LABELS: Record<string, string> = {
  alpha: "Alpha (excess return vs benchmark)",
  yield: "Yield (dividend/income yield)",
  relative_return: "Relative Return (benchmark-relative performance)",
  price: "Price (PE & PB valuation, equity only)",
  fee: "Fee (lower expense ratio = higher score)",
};

const RR_LABELS: Record<string, string> = {
  return_3yr: "3-Year Return",
  return_5yr: "5-Year Return",
  return_1yr: "1-Year Return",
  return_ytd: "Year-to-Date Return",
  return_qtd: "Quarter-to-Date Return",
  return_10yr: "10-Year Return",
  batting_avg_3yr: "3-Year Batting Average",
  batting_avg_5yr: "5-Year Batting Average",
};

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="rounded-lg border p-6 mb-6"
      style={{
        backgroundColor: "var(--card-bg)",
        borderColor: "var(--card-border)",
      }}
    >
      <h2
        className="text-lg font-semibold mb-1"
        style={{ color: "var(--foreground)" }}
      >
        {title}
      </h2>
      <p className="text-sm mb-5" style={{ color: "var(--text-muted)" }}>
        {description}
      </p>
      {children}
    </div>
  );
}

function NumberInput({
  label,
  value,
  onChange,
  step = 0.05,
  min,
  max,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
  min?: number;
  max?: number;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <label
        className="text-sm flex-1"
        style={{ color: "var(--foreground)" }}
      >
        {label}
      </label>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        step={step}
        min={min}
        max={max}
        className="w-24 px-3 py-1.5 rounded border text-sm font-mono text-right focus:outline-none focus:ring-2"
        style={{
          backgroundColor: "var(--background)",
          borderColor: "var(--card-border)",
          color: "var(--foreground)",
        }}
      />
    </div>
  );
}

function WeightSlider({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="py-2">
      <div className="flex items-center justify-between mb-1">
        <label className="text-sm" style={{ color: "var(--foreground)" }}>
          {label}
        </label>
        <span
          className="text-sm font-mono w-12 text-right"
          style={{ color: "var(--text-muted)" }}
        >
          {value.toFixed(2)}
        </span>
      </div>
      <input
        type="range"
        min={0}
        max={3}
        step={0.05}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-2 rounded-lg appearance-none cursor-pointer"
        style={{ accentColor: "var(--accent)" }}
      />
    </div>
  );
}

export default function FormulasPage() {
  const { isAdmin, loading: authLoading } = useAuth();
  const [config, setConfig] = useState<ScoringConfig | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch(`/api/config`);
      if (!res.ok) throw new Error("Failed to load config");
      const data = await res.json();
      setConfig(data);
      setError(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load config");
    }
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  const handleSave = async () => {
    if (!config) return;
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const res = await fetch(`/api/config`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      if (!res.ok) throw new Error("Failed to save");
      const data = await res.json();
      setConfig(data);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/config/reset`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to reset");
      const data = await res.json();
      setConfig(data);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to reset");
    } finally {
      setSaving(false);
    }
  };

  const update = (path: string, value: number) => {
    if (!config) return;
    const next = { ...config };
    const parts = path.split(".");
    if (parts.length === 2) {
      const [group, key] = parts;
      (next as Record<string, Record<string, number>>)[group] = {
        ...(next as Record<string, Record<string, number>>)[group],
        [key]: value,
      };
    } else {
      (next as Record<string, number>)[parts[0]] = value;
    }
    setConfig(next);
  };

  if (authLoading) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-10">
        <p style={{ color: "var(--text-muted)" }}>Loading...</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-10">
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
            modify scoring formulas.
          </p>
        </div>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-10">
        <p style={{ color: "var(--text-muted)" }}>
          {error ? `Error: ${error}` : "Loading configuration..."}
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <div className="mb-6">
        <Link
          href="/"
          className="text-sm font-medium no-underline hover:underline"
          style={{ color: "var(--accent)" }}
        >
          &larr; Home
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
        <div>
          <h1
            className="text-3xl font-bold mb-1"
            style={{ color: "var(--foreground)" }}
          >
            Scoring Formulas
          </h1>
          <p style={{ color: "var(--text-muted)" }}>
            View and adjust the parameters that drive the ranking algorithm.
            Changes recompute all rankings immediately.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={handleReset}
            disabled={saving}
            className="px-4 py-2 rounded-lg text-sm font-medium border transition-colors cursor-pointer disabled:opacity-50"
            style={{
              borderColor: "var(--card-border)",
              color: "var(--text-muted)",
              backgroundColor: "var(--card-bg)",
            }}
          >
            Reset Defaults
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 rounded-lg text-sm font-semibold transition-colors cursor-pointer disabled:opacity-50"
            style={{
              backgroundColor: "var(--accent)",
              color: "#ffffff",
            }}
          >
            {saving ? "Saving..." : "Save & Rerank"}
          </button>
        </div>
      </div>

      {saved && (
        <div
          className="rounded-lg border px-4 py-3 mb-6 text-sm font-medium"
          style={{
            backgroundColor: "#f0fdf4",
            borderColor: "#bbf7d0",
            color: "#16a34a",
          }}
        >
          Configuration saved. All rankings have been recomputed.
        </div>
      )}

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

      {/* Final GPA Formula */}
      <Section
        title="Final GPA Formula"
        description="Total GPA = (Risk Score x W_risk + Return Score x W_return) / (W_risk + W_return) + Market Cap Score + Turnover Score"
      >
        <div
          className="rounded-lg p-4 mb-5 font-mono text-sm leading-relaxed"
          style={{
            backgroundColor: "var(--accent-muted)",
            color: "var(--foreground)",
          }}
        >
          <p>
            GPA = (Risk x{" "}
            <strong>{config.gpa_risk_weight.toFixed(2)}</strong> + Return x{" "}
            <strong>{config.gpa_return_weight.toFixed(2)}</strong>) /{" "}
            <strong>
              {(config.gpa_risk_weight + config.gpa_return_weight).toFixed(2)}
            </strong>{" "}
            + MktCap + Turnover
          </p>
        </div>
        <NumberInput
          label="Risk weight in GPA"
          value={config.gpa_risk_weight}
          onChange={(v) => update("gpa_risk_weight", v)}
          min={0}
          step={0.1}
        />
        <NumberInput
          label="Return weight in GPA"
          value={config.gpa_return_weight}
          onChange={(v) => update("gpa_return_weight", v)}
          min={0}
          step={0.1}
        />
      </Section>

      {/* 3yr / 5yr Blending */}
      <Section
        title="3-Year / 5-Year Blending"
        description="When both timeframes are available: Blended = (3yr x W_3yr) + (5yr x W_5yr). If only 3yr exists, apply a short-record penalty multiplier."
      >
        <div
          className="rounded-lg p-4 mb-5 font-mono text-sm leading-relaxed"
          style={{
            backgroundColor: "var(--accent-muted)",
            color: "var(--foreground)",
          }}
        >
          <p>
            Blended = 3yr x{" "}
            <strong>{config.blend_weight_3yr.toFixed(2)}</strong> + 5yr x{" "}
            <strong>{config.blend_weight_5yr.toFixed(2)}</strong>
          </p>
          <p>
            3yr-only penalty: x{" "}
            <strong>{config.short_record_penalty.toFixed(2)}</strong>
          </p>
        </div>
        <NumberInput
          label="3-Year weight"
          value={config.blend_weight_3yr}
          onChange={(v) => update("blend_weight_3yr", v)}
          min={0}
          max={1}
        />
        <NumberInput
          label="5-Year weight"
          value={config.blend_weight_5yr}
          onChange={(v) => update("blend_weight_5yr", v)}
          min={0}
          max={1}
        />
        <NumberInput
          label="Short record penalty"
          value={config.short_record_penalty}
          onChange={(v) => update("short_record_penalty", v)}
          min={0}
          max={1}
        />
      </Section>

      {/* Risk Weights */}
      <Section
        title="Risk Score Weights"
        description="Risk Score = weighted average of 12 normalized sub-components. Adjust each metric's importance (0 = excluded, 1 = normal, >1 = amplified)."
      >
        <div
          className="rounded-lg p-4 mb-5 font-mono text-sm"
          style={{
            backgroundColor: "var(--accent-muted)",
            color: "var(--foreground)",
          }}
        >
          Risk Score = SUM(metric_i x weight_i) / SUM(weight_i)
        </div>
        {Object.entries(config.risk_weights).map(([key, val]) => (
          <WeightSlider
            key={key}
            label={RISK_LABELS[key] || key}
            value={val}
            onChange={(v) => update(`risk_weights.${key}`, v)}
          />
        ))}
      </Section>

      {/* Return Weights */}
      <Section
        title="Return Score Weights"
        description="Return Score = weighted average of 5 normalized sub-components."
      >
        <div
          className="rounded-lg p-4 mb-5 font-mono text-sm"
          style={{
            backgroundColor: "var(--accent-muted)",
            color: "var(--foreground)",
          }}
        >
          Return Score = SUM(component_i x weight_i) / SUM(weight_i)
        </div>
        {Object.entries(config.return_weights).map(([key, val]) => (
          <WeightSlider
            key={key}
            label={RETURN_LABELS[key] || key}
            value={val}
            onChange={(v) => update(`return_weights.${key}`, v)}
          />
        ))}
      </Section>

      {/* Relative Return Weights */}
      <Section
        title="Relative Return Time Horizon Weights"
        description="Within the Relative Return sub-component, how much weight each time horizon gets."
      >
        {Object.entries(config.relative_return_weights).map(([key, val]) => (
          <WeightSlider
            key={key}
            label={RR_LABELS[key] || key}
            value={val}
            onChange={(v) => update(`relative_return_weights.${key}`, v)}
          />
        ))}
      </Section>

      {/* Market Cap */}
      <Section
        title="Market Cap Score"
        description="Bonus score based on assets under management."
      >
        <div
          className="rounded-lg p-4 mb-5 font-mono text-sm"
          style={{
            backgroundColor: "var(--accent-muted)",
            color: "var(--foreground)",
          }}
        >
          Market Cap Score = AUM /{" "}
          <strong>{config.market_cap_divisor.toFixed(0)}</strong>
        </div>
        <NumberInput
          label="AUM divisor"
          value={config.market_cap_divisor}
          onChange={(v) => update("market_cap_divisor", v)}
          step={100}
          min={1}
        />
      </Section>

      {/* Turnover */}
      <Section
        title="Turnover Score"
        description="Penalty for high-turnover funds."
      >
        <div
          className="rounded-lg p-4 mb-5 font-mono text-sm leading-relaxed"
          style={{
            backgroundColor: "var(--accent-muted)",
            color: "var(--foreground)",
          }}
        >
          <p>
            if turnover &le;{" "}
            <strong>{config.turnover_threshold.toFixed(0)}%</strong> &rarr; 0
          </p>
          <p>
            else &rarr; turnover /{" "}
            <strong>{config.turnover_divisor.toFixed(1)}</strong>
          </p>
        </div>
        <NumberInput
          label="Threshold (%)"
          value={config.turnover_threshold}
          onChange={(v) => update("turnover_threshold", v)}
          step={5}
          min={0}
        />
        <NumberInput
          label="Divisor (negative = penalty)"
          value={config.turnover_divisor}
          onChange={(v) => update("turnover_divisor", v)}
          step={0.5}
        />
      </Section>
    </div>
  );
}
