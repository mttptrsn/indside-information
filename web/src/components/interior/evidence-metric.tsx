export function EvidenceMetric({
  label,
  value,
  detail,
  accent = false,
}: {
  label: string;
  value: string;
  detail?: string;
  accent?: boolean;
}) {
  return (
    <div className="border-t border-[var(--line)] pt-4">
      <p className="eyebrow">{label}</p>
      <p
        className={`mt-3 font-display text-4xl leading-none tracking-[-0.04em] ${
          accent ? "text-[var(--accent-ink)]" : ""
        }`}
      >
        {value}
      </p>
      {detail ? (
        <p className="mt-3 max-w-xs text-sm leading-6 text-[var(--ink-muted)]">
          {detail}
        </p>
      ) : null}
    </div>
  );
}
