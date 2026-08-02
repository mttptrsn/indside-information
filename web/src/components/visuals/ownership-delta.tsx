import { formatNumber, formatPercent } from "@/lib/format";

export function OwnershipDelta({
  before,
  after,
  percent,
}: {
  before?: number | null;
  after?: number | null;
  percent?: number | null;
}) {
  const maximum = Math.max(after ?? 0, before ?? 0, 1);
  const beforeWidth = Math.max(3, ((before ?? 0) / maximum) * 100);
  const afterWidth = Math.max(3, ((after ?? 0) / maximum) * 100);

  return (
    <figure className="space-y-8">
      <div>
        <div className="mb-3 flex items-center justify-between">
          <span className="eyebrow">Before</span>
          <span className="font-mono text-sm">{formatNumber(before)} shares</span>
        </div>
        <div className="h-3 bg-[var(--surface-raised)]">
          <div
            className="h-full bg-[var(--ink-muted)]"
            style={{ width: `${beforeWidth}%` }}
          />
        </div>
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <span className="eyebrow">After</span>
          <span className="font-mono text-sm">{formatNumber(after)} shares</span>
        </div>
        <div className="h-3 bg-[var(--surface-raised)]">
          <div
            className="h-full bg-[var(--accent)]"
            style={{ width: `${afterWidth}%` }}
          />
        </div>
      </div>

      <figcaption className="font-display text-6xl tracking-[-0.04em]">
        {formatPercent(percent)}
      </figcaption>
    </figure>
  );
}
