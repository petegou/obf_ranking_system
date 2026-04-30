export function EmptyDetail() {
  return (
    <div className="p-6 h-full flex flex-col items-center justify-center text-center">
      <div className="text-sm font-medium text-[var(--text-secondary)]">
        Select a fund
      </div>
      <p className="mt-1 text-xs text-[var(--text-tertiary)] max-w-[200px]">
        Click a row in the table to inspect score breakdowns and peer comparison.
      </p>
    </div>
  );
}
