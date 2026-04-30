export const dynamic = "force-dynamic";

export default function OverviewPlaceholder() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold">Overview (placeholder)</h1>
      <p className="mt-2 text-sm text-[var(--text-tertiary)]">
        AppShell is rendering - content area is here.
      </p>
    </div>
  );
}
