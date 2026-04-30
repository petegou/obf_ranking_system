export function ComingSoonPanel({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-card)] p-8">
        <div className="text-[10px] uppercase tracking-wider text-[var(--text-quaternary)] font-medium">
          Coming Soon
        </div>
        <h1 className="mt-1 text-xl font-semibold text-[var(--text-primary)]">
          {title}
        </h1>
        <p className="mt-3 text-sm text-[var(--text-secondary)] leading-relaxed">
          {description}
        </p>
      </div>
    </div>
  );
}
