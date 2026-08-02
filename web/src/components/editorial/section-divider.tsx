export function SectionDivider({
  label,
  index,
}: {
  label?: string;
  index?: string;
}) {
  const visibleLabel = [index, label].filter(Boolean).join(" · ");

  return (
    <div
      className="editorial-container flex items-center gap-4 py-8"
      aria-hidden={!visibleLabel}
    >
      <div className="h-px flex-1 bg-[var(--line)]" />
      {visibleLabel ? (
        <span className="text-[0.6875rem] uppercase tracking-[0.18em] text-[var(--ink-soft)]">
          {visibleLabel}
        </span>
      ) : null}
      <div className="h-px flex-1 bg-[var(--line)]" />
    </div>
  );
}
