import Link from "next/link";
import { X } from "lucide-react";
import { formatCurrency, slugifyTicker } from "@/lib/format";
import type { EvidenceCompany } from "@/lib/evidence";

export function EvidenceComparison({
  companies,
  onRemove,
}: {
  companies: EvidenceCompany[];
  onRemove: (id: string) => void;
}) {
  if (!companies.length) {
    return (
      <div className="border-y border-[var(--line)] py-12">
        <p className="font-display text-3xl">
          Select up to four companies to compare.
        </p>

        <p className="mt-3 max-w-xl text-sm leading-6 text-[var(--ink-muted)]">
          Comparison exposes where conviction, coordination, ownership,
          purchase size, and price context differ.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto border-y border-[var(--line)]">
      <div
        className="grid min-w-[52rem]"
        style={{
          gridTemplateColumns: `12rem repeat(${companies.length}, minmax(10rem, 1fr))`,
        }}
      >
        <div className="border-r border-[var(--line)] p-4" />

        {companies.map((company) => (
          <div
            key={[
              company.issuer_cik,
              company.ticker,
              company.company_name,
            ]
              .filter(Boolean)
              .map((value) =>
                String(value).trim().toLowerCase(),
              )
              .join("|")}
            className="border-r border-[var(--line)] p-4 last:border-r-0"
          >
            <div className="flex items-start justify-between gap-4">
              <Link
                href={`/companies/${slugifyTicker(
                  company.ticker ?? "",
                )}`}
                className="font-display text-3xl leading-none"
              >
                {company.ticker}
              </Link>

              <button
                type="button"
                onClick={() =>
                  onRemove(
                    [
              company.issuer_cik,
              company.ticker,
              company.company_name,
            ]
              .filter(Boolean)
              .map((value) =>
                String(value).trim().toLowerCase(),
              )
              .join("|"),
                  )
                }
                aria-label={`Remove ${company.ticker} from comparison`}
              >
                <X className="size-4" />
              </button>
            </div>

            <p className="mt-2 text-xs text-[var(--ink-muted)]">
              {company.company_name}
            </p>
          </div>
        ))}

        <ComparisonRow
          label="Evidence"
          values={companies.map((company) =>
            String(company.evidence_score),
          )}
        />
        <ComparisonRow
          label="Buyers"
          values={companies.map((company) =>
            String(company.buyer_count ?? 0),
          )}
        />
        <ComparisonRow
          label="Capital committed"
          values={companies.map((company) =>
            formatCurrency(company.purchase_value),
          )}
        />
        <ComparisonRow
          label="Behavior change"
          values={companies.map((company) =>
            String(
              Math.round(
                Number(company.behavior_change_score ?? 0),
              ),
            ),
          )}
        />
        <ComparisonRow
          label="Ownership increase"
          values={companies.map((company) => {
            const ownership = Number(
              company.ownership_increase_percent ??
                company.ownership_increase_percentage,
            );

            return Number.isFinite(ownership)
              ? `${ownership.toFixed(1)}%`
              : "Unavailable";
          })}
        />
        <ComparisonRow
          label="Versus executive cost"
          values={companies.map((company) => {
            const value = Number(
              company.story_summary
                ?.percent_vs_average_purchase_price,
            );

            return Number.isFinite(value)
              ? `${value > 0 ? "+" : ""}${value.toFixed(1)}%`
              : "Unavailable";
          })}
        />
      </div>
    </div>
  );
}

function ComparisonRow({
  label,
  values,
}: {
  label: string;
  values: string[];
}) {
  return (
    <>
      <div className="border-r border-t border-[var(--line)] p-4 text-sm text-[var(--ink-muted)]">
        {label}
      </div>

      {values.map((value, index) => (
        <div
          key={`${label}-${index}`}
          className="border-r border-t border-[var(--line)] p-4 font-mono text-sm last:border-r-0"
        >
          {value}
        </div>
      ))}
    </>
  );
}
