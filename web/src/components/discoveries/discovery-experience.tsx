"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { EvidenceCard } from "@/components/evidence/evidence-card";
import { EvidenceComparison } from "@/components/evidence/evidence-comparison";
import { EvidencePercentiles } from "@/components/evidence/evidence-percentiles";
import { EvidenceScoreBreakdown } from "@/components/evidence/evidence-score-breakdown";
import {
  enrichEvidence,
  modeScore,
  type EvidenceCompany,
  type EvidenceMode,
} from "@/lib/evidence";
import type { DiscoveryItem } from "@/types/home";

const MODES: Array<{
  id: EvidenceMode;
  label: string;
  description: string;
}> = [
  {
    id: "overall",
    label: "Strongest overall",
    description: "Best combined evidence across all signals.",
  },
  {
    id: "together",
    label: "Acting together",
    description: "Multiple independent executives buying the same company.",
  },
  {
    id: "silence",
    label: "Returning after silence",
    description: "Executives buying again after unusually long gaps.",
  },
  {
    id: "ownership",
    label: "Growing ownership",
    description: "The largest meaningful increases in personal exposure.",
  },
  {
    id: "drawdown",
    label: "Buying drawdowns",
    description: "Strong insider evidence during meaningful price weakness.",
  },
  {
    id: "below_cost",
    label: "Below executive cost",
    description: "Prices currently below the executive purchase basis.",
  },
  {
    id: "small_cap",
    label: "Smaller companies",
    description: "High-conviction evidence with lower market capitalization.",
  },
];

export function DiscoveryExperience({
  items,
  sectors,
}: {
  items: DiscoveryItem[];
  sectors: string[];
  categories: string[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const initialMode =
    (searchParams.get("view") as EvidenceMode | null) ??
    "overall";
  const initialSector = searchParams.get("sector") ?? "all";
  const initialQuery = searchParams.get("q") ?? "";

  const [mode, setMode] = useState<EvidenceMode>(initialMode);
  const [sector, setSector] = useState(initialSector);
  const [query, setQuery] = useState(initialQuery);
  const [selectedId, setSelectedId] = useState("");
  const [comparisonIds, setComparisonIds] = useState<string[]>([]);

  const enriched = useMemo(
    () => enrichEvidence(items),
    [items],
  );

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();

    return enriched
      .filter((item) => {
        const sectorMatch =
          sector === "all" || item.sector === sector;

        const queryMatch =
          !needle ||
          [
            item.ticker,
            item.company_name,
            item.sector,
            item.industry,
            item.headline,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()
            .includes(needle);

        return sectorMatch && queryMatch;
      })
      .sort(
        (left, right) =>
          modeScore(right, mode) - modeScore(left, mode) ||
          right.evidence_score - left.evidence_score ||
          String(left.ticker).localeCompare(
            String(right.ticker),
          ),
      );
  }, [enriched, mode, query, sector]);

  const selected =
    filtered.find(
      (item) =>
        evidenceId(item) === selectedId,
    ) ?? filtered[0];

  const comparison = comparisonIds
    .map((id) =>
      enriched.find(
        (item) => evidenceId(item) === id,
      ),
    )
    .filter(
      (item): item is EvidenceCompany => Boolean(item),
    );

  useEffect(() => {
    const params = new URLSearchParams();

    if (mode !== "overall") {
      params.set("view", mode);
    }

    if (sector !== "all") {
      params.set("sector", sector);
    }

    if (query.trim()) {
      params.set("q", query.trim());
    }

    const queryString = params.toString();
    router.replace(
      queryString ? `${pathname}?${queryString}` : pathname,
      {
        scroll: false,
      },
    );
  }, [mode, pathname, query, router, sector]);

  const toggleComparison = (company: EvidenceCompany) => {
    const id = evidenceId(company);

    setComparisonIds((current) => {
      if (current.includes(id)) {
        return current.filter((candidate) => candidate !== id);
      }

      if (current.length >= 4) {
        return [...current.slice(1), id];
      }

      return [...current, id];
    });
  };

  return (
    <div>
      <div className="sticky top-16 z-20 border-y border-[var(--line)] bg-[color-mix(in_srgb,var(--canvas)_94%,transparent)] backdrop-blur-xl">
        <div className="editorial-container grid gap-4 py-4 lg:grid-cols-[minmax(0,1fr)_14rem]">
          <label className="flex items-center gap-3">
            <Search className="size-4 text-[var(--ink-soft)]" />

            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search company, ticker, sector, or evidence"
              className="w-full bg-transparent outline-none"
            />
          </label>

          <select
            value={sector}
            onChange={(event) => setSector(event.target.value)}
            className="border border-[var(--line)] bg-transparent px-3 py-2 text-sm"
          >
            <option value="all">Every sector</option>

            {sectors.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="editorial-container py-8">
        <div className="flex gap-3 overflow-x-auto pb-2">
          {MODES.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setMode(option.id)}
              className={`shrink-0 border px-4 py-3 text-left ${
                mode === option.id
                  ? "border-[var(--ink)] bg-[var(--ink)] text-[var(--canvas)]"
                  : "border-[var(--line)]"
              }`}
            >
              <span className="block text-sm font-medium">
                {option.label}
              </span>

              <span className="mt-1 block max-w-[15rem] text-xs opacity-70">
                {option.description}
              </span>
            </button>
          ))}
        </div>

        <section className="mt-10">
          <p className="eyebrow">Compare evidence</p>

          <div className="mt-5">
            <EvidenceComparison
              companies={comparison}
              onRemove={(id) =>
                setComparisonIds((current) =>
                  current.filter(
                    (candidate) => candidate !== id,
                  ),
                )
              }
            />
          </div>
        </section>

        <div className="mt-12 grid gap-12 xl:grid-cols-[minmax(0,1fr)_22rem]">
          <div>
            <p className="mb-8 text-sm text-[var(--ink-muted)]">
              {filtered.length.toLocaleString("en-US")} companies in this
              investigation view.
            </p>

            <div className="grid gap-10 md:grid-cols-2">
              {filtered.slice(0, 40).map((company, index) => {
                const companyId = evidenceId(company);
                const rowKey = evidenceRowKey(company, index);

                return (
                  <EvidenceCard
                    key={rowKey}
                    company={company}
                    selected={
                      selected
                        ? evidenceId(selected) === companyId
                        : false
                    }
                    comparisonSelected={comparisonIds.includes(companyId)}
                    onSelect={() => setSelectedId(companyId)}
                    onCompare={() => toggleComparison(company)}
                  />
                );
              })}
            </div>
          </div>

          {selected ? (
            <aside className="xl:sticky xl:top-32 xl:self-start">
              <p className="eyebrow">
                Why {selected.ticker} ranks here
              </p>

              <h2 className="mt-5 font-display text-4xl leading-[0.96]">
                {selected.headline}
              </h2>

              <p className="mt-8 font-mono text-5xl">
                {selected.evidence_score}
              </p>

              <p className="mt-2 text-sm text-[var(--ink-muted)]">
                combined evidence
              </p>

              <div className="mt-8">
                <EvidenceScoreBreakdown company={selected} />
              </div>

              <div className="mt-10">
                <p className="mb-4 text-xs uppercase tracking-[0.12em] text-[var(--ink-soft)]">
                  Relative to the current universe
                </p>

                <EvidencePercentiles company={selected} />
              </div>
            </aside>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function evidenceId(item: EvidenceCompany): string {
  return [
    item.issuer_cik,
    item.ticker,
    item.company_name,
  ]
    .filter(Boolean)
    .map((value) =>
      String(value).trim().toLowerCase(),
    )
    .join("|");
}

function evidenceRowKey(
  item: EvidenceCompany,
  index: number,
): string {
  return [
    evidenceId(item),
    item.category,
    item.headline,
    index,
  ]
    .filter(
      (value) =>
        value !== null &&
        value !== undefined &&
        String(value).trim() !== "",
    )
    .map((value) =>
      String(value).trim().toLowerCase(),
    )
    .join("|");
}
