export function MarketDataPlaceholder() {
  return (
    <div className="rounded-md border border-dashed border-[var(--border-default)] p-4 text-xs text-[var(--text-tertiary)]">
      <div className="font-medium text-[var(--text-secondary)] mb-1">
        Market data
      </div>
      Marketplace API integration is not yet wired. This panel will show price,
      AUM, expense ratio, and yield once connected.
    </div>
  );
}
