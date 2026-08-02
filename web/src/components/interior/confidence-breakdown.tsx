import { ConvictionDial } from "@/components/interior/conviction-dial";
import { numberValue } from "@/lib/record";
import { formatScore } from "@/lib/format";

const COMPONENTS = [
  ["Purchase abnormality", "abnormality_score"],
  ["Silence break", "silence_break_score"],
  ["Cluster confirmation", "cluster_score"],
  ["Behavior change", "behavior_change_score"],
  ["Ownership impact", "ownership_score"],
  ["Role relevance", "role_quality_score"],
] as const;

export function ConfidenceBreakdown({
  signal,
}: {
  signal?: Record<string, unknown> | null;
}) {
  const rows = COMPONENTS.map(([label, key]) => ({
    label,
    value: numberValue(signal, key) ?? 0,
  })).filter((row) => row.value > 0);

  const conviction = numberValue(signal, "conviction_score", "score");

  return (
    <section>
      <div className="grid gap-14 lg:grid-cols-12 lg:items-center">
        <div className="lg:col-span-5">
          <ConvictionDial
            score={conviction}
            detail="Evidence strength after context, quality, and explicit penalties"
          />
        </div>
        <div className="space-y-7 lg:col-span-7">
          <div className="mb-10">
            <p className="eyebrow">Signal anatomy</p>
            <h2 className="mt-5 font-display text-5xl leading-[0.96] tracking-[-0.04em]">
              No mystery score.
            </h2>
          </div>
          {rows.length ? (
            rows.map((row) => (
              <div key={row.label}>
                <div className="mb-3 flex items-center justify-between gap-6">
                  <span className="text-sm">{row.label}</span>
                  <span className="font-mono text-sm">
                    {formatScore(row.value)}
                  </span>
                </div>
                <div className="h-px overflow-visible bg-[var(--line)]">
                  <div
                    className="relative h-px bg-[var(--accent)]"
                    style={{
                      width: `${Math.min(100, Math.max(3, row.value))}%`,
                    }}
                  >
                    <span className="absolute -right-1 -top-1 size-2 rounded-full bg-[var(--accent)]" />
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p className="text-[var(--ink-muted)]">
              Component-level evidence is not available for this signal.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
