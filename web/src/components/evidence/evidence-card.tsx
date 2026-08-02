import Link from "next/link";
import { Check, Plus } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import type { EvidenceCompany } from "@/lib/evidence";

export function EvidenceCard({
  company,
  selected,
  comparisonSelected,
  onSelect,
  onCompare,
}: {
  company: EvidenceCompany;
  selected: boolean;
  comparisonSelected: boolean;
  onSelect: () => void;
  onCompare: () => void;
}) {
  return (
    <article
      className={`border-t pt-5 transition-opacity ${
        selected
          ? "border-[var(--accent)] opacity-100"
          : "border-[var(--line-strong)] opacity-80 hover:opacity-100"
      }`}
    >
      <div className="flex items-start justify-between gap-5">
        <button
          type="button"
          onClick={onSelect}
          className="min-w-0 flex-1 text-left"
        >
          <p className="eyebrow">
            {company.evidence_score} evidence
          </p>

          <h2 className="mt-4 font-display text-5xl leading-none">
            {company.ticker}
          </h2>

          <p className="mt-3 text-sm">
            {company.company_name}
          </p>

          <p className="mt-1 text-xs text-[var(--ink-muted)]">
            {[company.sector, company.industry]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </button>

        <button
          type="button"
          onClick={onCompare}
          aria-label={`${
            comparisonSelected ? "Remove" : "Add"
          } ${company.ticker} ${
            comparisonSelected ? "from" : "to"
          } comparison`}
          className="inline-flex size-10 items-center justify-center border border-[var(--line)]"
        >
          {comparisonSelected ? (
            <Check className="size-4" />
          ) : (
            <Plus className="size-4" />
          )}
        </button>
      </div>

      <div className="mt-6 h-3 bg-[var(--line)]">
        <div
          className="h-full bg-[var(--ink)]"
          style={{
            width: `${Math.max(
              5,
              company.evidence_score,
            )}%`,
          }}
        />
      </div>

      <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm">
        <span>
          <strong>{company.buyer_count ?? 0}</strong> buyers
        </span>

        <span>
          <strong>
            {formatCurrency(company.purchase_value)}
          </strong>{" "}
          purchased
        </span>
      </div>

      <p className="mt-5 text-sm leading-6 text-[var(--ink-muted)]">
        {company.headline}
      </p>

      {company.company_slug ? (
        <Link
          href={`/companies/${company.company_slug}`}
          className="mt-6 inline-flex border-b border-[var(--ink)] pb-1 text-sm"
        >
          Open company evidence
        </Link>
      ) : null}
    </article>
  );
}
