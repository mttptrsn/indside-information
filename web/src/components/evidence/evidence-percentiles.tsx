import type { EvidenceCompany } from "@/lib/evidence";

const rows = [
  ["purchase_value", "Purchase size"],
  ["buyer_count", "Buyer count"],
  ["behavior_change", "Behavior change"],
  ["ownership_increase", "Ownership increase"],
  ["conviction", "Conviction"],
] as const;

export function EvidencePercentiles({
  company,
}: {
  company: EvidenceCompany;
}) {
  return (
    <dl className="divide-y divide-[var(--line)] border-y border-[var(--line)]">
      {rows.map(([key, label]) => (
        <div
          key={key}
          className="grid grid-cols-[1fr_auto] gap-5 py-4"
        >
          <dt className="text-sm text-[var(--ink-muted)]">
            {label}
          </dt>

          <dd className="font-mono text-sm">
            {company.percentiles[key]}th percentile
          </dd>
        </div>
      ))}
    </dl>
  );
}
