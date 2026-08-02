export function StatCallout({ label, value, context }: { label: string; value: string; context?: string }) {
  return (
    <div className="border-t border-[var(--line)] pt-4">
      <p className="text-xs uppercase tracking-[0.16em] text-[var(--ink-muted)]">{label}</p>
      <p className="mt-3 font-mono text-3xl tracking-[-0.04em] text-[var(--ink)] md:text-4xl">{value}</p>
      {context ? <p className="mt-2 text-sm leading-6 text-[var(--ink-muted)]">{context}</p> : null}
    </div>
  );
}
