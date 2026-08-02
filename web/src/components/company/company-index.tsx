"use client";

import Link from "next/link";
import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { safeText } from "@/lib/visual";
import type { CompanyIndexItem } from "@/types/interior";

export function CompanyIndex({
  companies,
}: {
  companies: CompanyIndexItem[];
}) {
  const [query, setQuery] = useState("");

  const items = useMemo(
    () =>
      companies
        .map((company, index) => ({
          key: `${safeText(
            company.issuer_cik,
            "company",
          )}-${safeText(
            company.slug,
            String(index),
          )}`,
          slug: safeText(company.slug),
          ticker: safeText(
            company.ticker,
            "—",
          ),
          name: safeText(
            company.company_name,
            "Company",
          ),
          sector: safeText(
            company.sector,
            "Unclassified",
          ),
        }))
        .filter(
          (company) =>
            company.slug &&
            company.ticker !== "—",
        ),
    [companies],
  );

  const filtered = useMemo(() => {
    const needle = query
      .trim()
      .toLowerCase();

    if (!needle) {
      return items;
    }

    return items.filter((item) =>
      [
        item.ticker,
        item.name,
        item.sector,
      ]
        .join(" ")
        .toLowerCase()
        .includes(needle),
    );
  }, [items, query]);

  return (
    <div className="editorial-container pb-16">
      <label className="flex items-center gap-4 border-y border-[var(--line)] py-5">
        <Search className="size-5 text-[var(--ink-soft)]" />

        <span className="sr-only">
          Search companies with insider buying
        </span>

        <input
          value={query}
          onChange={(event) =>
            setQuery(event.target.value)
          }
          placeholder="Find a company with qualifying buying"
          className="w-full bg-transparent font-display text-3xl outline-none placeholder:text-[var(--ink-soft)] md:text-5xl"
        />
      </label>

      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((company) => (
          <Link
            key={company.key}
            href={`/companies/${company.slug}`}
            className="border-t border-[var(--line-strong)] pt-4"
          >
            <p className="font-display text-4xl leading-none">
              {company.ticker}
            </p>

            <p className="mt-3 text-sm">
              {company.name}
            </p>

            <p className="mt-1 text-xs text-[var(--ink-muted)]">
              {company.sector}
            </p>
          </Link>
        ))}
      </div>

      {!filtered.length ? (
        <div className="py-20 text-center">
          <p className="font-display text-4xl leading-none">
            No qualifying company matches that search.
          </p>
        </div>
      ) : null}
    </div>
  );
}
