import type { EvidenceCompany } from "@/lib/evidence";

const labels = {
  conviction: "Executive conviction",
  behavior_change: "Behavior changed",
  cluster: "Acting together",
  abnormality: "Purchase abnormality",
  silence_break: "Silence broken",
  ownership: "Ownership increase",
  role_quality: "Role relevance",
  data_quality: "Data quality",
} as const;

export function EvidenceScoreBreakdown({
  company,
}: {
  company: EvidenceCompany;
}) {
  return (
    <div className="space-y-4">
      {Object.entries(company.score_components).map(
        ([key, value]) => (
          <div key={key}>
            <div className="flex items-center justify-between gap-4 text-sm">
              <span className="text-[var(--ink-muted)]">
                {labels[key as keyof typeof labels]}
              </span>

              <span className="font-mono">
                {Math.round(value)}
              </span>
            </div>

            <div className="mt-2 h-2 bg-[var(--line)]">
              <div
                className="h-full bg-[var(--ink)]"
                style={{
                  width: `${Math.max(2, Math.min(100, value))}%`,
                }}
              />
            </div>
          </div>
        ),
      )}
    </div>
  );
}
