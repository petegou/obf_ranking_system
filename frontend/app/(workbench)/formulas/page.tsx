"use client";

import { useEffect, useState, useCallback } from "react";
import { RotateCcw, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
    <section className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-card)] p-6 shadow-sm">
      <h2 className="text-base font-semibold text-[var(--text-primary)]">
        {title}
      </h2>
      <p className="mb-5 mt-1 text-sm text-[var(--text-secondary)]">
        {description}
      </p>
      {children}
    </section>
  );
}

function FormulaBlock({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-5 rounded-md border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-4 font-mono text-sm leading-relaxed text-[var(--text-primary)]">
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
    <div className="flex items-center justify-between gap-4 border-t border-[var(--border-subtle)] py-3 first:border-t-0">
      <label className="flex-1 text-sm text-[var(--text-primary)]">
        {label}
      </label>
      <Input
        type="number"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        step={step}
        min={min}
        max={max}
        className="h-8 w-24 border-[var(--border-default)] bg-[var(--surface-card)] text-right font-mono text-sm text-[var(--text-primary)]"
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
    <div className="border-t border-[var(--border-subtle)] py-3 first:border-t-0">
      <div className="mb-2 flex items-center justify-between gap-4">
        <label className="text-sm text-[var(--text-primary)]">
          {label}
        </label>
        <span className="w-12 text-right font-mono text-sm text-[var(--text-tertiary)]">
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
        className="h-2 w-full cursor-pointer rounded-lg"
        style={{ accentColor: "var(--brand-primary)" }}
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
      (next as unknown as Record<string, Record<string, number>>)[group] = {
        ...(next as unknown as Record<string, Record<string, number>>)[group],
        [key]: value,
      };
    } else {
      (next as unknown as Record<string, number>)[parts[0]] = value;
    }
    setConfig(next);
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
            modify scoring formulas.
          </p>
        </div>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="mx-auto max-w-5xl px-8 py-8">
        <p className="text-sm text-[var(--text-secondary)]">
          {error ? `Error: ${error}` : "Loading configuration..."}
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 px-8 py-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-[var(--text-primary)]">
            Scoring Formulas
          </h1>
          <p className="mt-0.5 text-sm text-[var(--text-tertiary)]">
            View and adjust the parameters that drive the ranking algorithm.
            Changes recompute all rankings immediately.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={handleReset}
            disabled={saving}
            className="border-[var(--border-default)] bg-[var(--surface-card)] text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]"
          >
            <RotateCcw />
            Reset Defaults
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="bg-[var(--brand-primary)] text-white hover:bg-[var(--brand-primary)]/90"
          >
            <Save />
            {saving ? "Saving..." : "Save & Rerank"}
          </Button>
        </div>
      </header>

      {saved && (
        <div className="rounded-lg border border-[var(--score-strong)]/20 bg-[var(--score-strong)]/10 px-4 py-3 text-sm font-medium text-[var(--score-strong)]">
          Configuration saved. All rankings have been recomputed.
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-[var(--score-weak)]/20 bg-[var(--score-weak)]/10 px-4 py-3 text-sm font-medium text-[var(--score-weak)]">
          {error}
        </div>
      )}

      {/* Final GPA Formula */}
      <Section
        title="Final GPA Formula"
        description="Total GPA = (Risk Score x W_risk + Return Score x W_return) / (W_risk + W_return) + Market Cap Score + Turnover Score"
      >
        <FormulaBlock>
          <p>
            GPA = (Risk x{" "}
            <strong>{config.gpa_risk_weight.toFixed(2)}</strong> + Return x{" "}
            <strong>{config.gpa_return_weight.toFixed(2)}</strong>) /{" "}
            <strong>
              {(config.gpa_risk_weight + config.gpa_return_weight).toFixed(2)}
            </strong>{" "}
            + MktCap + Turnover
          </p>
        </FormulaBlock>
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
        <FormulaBlock>
          <p>
            Blended = 3yr x{" "}
            <strong>{config.blend_weight_3yr.toFixed(2)}</strong> + 5yr x{" "}
            <strong>{config.blend_weight_5yr.toFixed(2)}</strong>
          </p>
          <p>
            3yr-only penalty: x{" "}
            <strong>{config.short_record_penalty.toFixed(2)}</strong>
          </p>
        </FormulaBlock>
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
        <FormulaBlock>
          Risk Score = SUM(metric_i x weight_i) / SUM(weight_i)
        </FormulaBlock>
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
        <FormulaBlock>
          Return Score = SUM(component_i x weight_i) / SUM(weight_i)
        </FormulaBlock>
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
        <FormulaBlock>
          Market Cap Score = AUM /{" "}
          <strong>{config.market_cap_divisor.toFixed(0)}</strong>
        </FormulaBlock>
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
        <FormulaBlock>
          <p>
            if turnover &le;{" "}
            <strong>{config.turnover_threshold.toFixed(0)}%</strong> &rarr; 0
          </p>
          <p>
            else &rarr; turnover /{" "}
            <strong>{config.turnover_divisor.toFixed(1)}</strong>
          </p>
        </FormulaBlock>
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
