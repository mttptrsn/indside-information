import type { Metadata } from "next";
import { DiscoveryExperience } from "@/components/discoveries/discovery-experience";
import {
  loadCompanyIndex,
  loadDiscoveries,
} from "@/lib/data/interiors";
import type { DiscoveryItem } from "@/types/home";

export const metadata: Metadata = {
  title: "Evidence",
  description:
    "Compare executive buying evidence, inspect score components, and investigate why companies rank.",
};

export default async function DiscoveriesPage() {
  const [data, companyIndex] = await Promise.all([
    loadDiscoveries(),
    loadCompanyIndex(),
  ]);

  const byCik = new Map(
    companyIndex.items
      .filter((company) => company.issuer_cik)
      .map((company) => [
        String(company.issuer_cik),
        company,
      ]),
  );

  const byTicker = new Map(
    companyIndex.items
      .filter((company) => company.ticker)
      .map((company) => [
        String(company.ticker).toUpperCase(),
        company,
      ]),
  );

  const validTicker = (value: unknown): string => {
    const ticker = String(value ?? "").trim().toUpperCase();

    if (
      !ticker ||
      !/^[A-Z0-9][A-Z0-9.-]{0,14}$/.test(ticker) ||
      [
        "NONE",
        "NULL",
        "NAN",
        "N/A",
        "NA",
        "UNDEFINED",
        "-",
        ".",
      ].includes(ticker)
    ) {
      return "";
    }

    return ticker;
  };

  const seen = new Set<string>();
  const items: DiscoveryItem[] = [];

  for (const section of Object.values(data.sections)) {
    for (const raw of section.items) {
      const company =
        byCik.get(String(raw.issuer_cik ?? "")) ??
        byTicker.get(
          String(raw.ticker ?? "").toUpperCase(),
        );

      const ticker = validTicker(
        company?.ticker ?? raw.ticker,
      );
      const companySlug = String(
        company?.slug ?? "",
      ).trim();

      if (!company || !ticker || !companySlug) {
        continue;
      }

      const item: DiscoveryItem = {
        ...raw,
        ticker,
        company_slug: companySlug,
        company_name:
          company.company_name ??
          raw.company_name ??
          "",
        sector:
          raw.sector ?? company?.sector ?? "",
        industry:
          raw.industry ?? company?.industry ?? "",
        market_cap:
          raw.market_cap ?? company?.market_cap ?? null,
        price_available:
          company?.price_available ?? null,
        story_path:
          company?.story_path ?? null,
        story_summary:
          company?.story_summary ?? null,
      };

      const key = [
        item.issuer_cik,
        item.ticker,
        item.company_name,
      ]
        .filter(Boolean)
        .join("|")
        .toLowerCase();

      if (!key || seen.has(key)) continue;

      seen.add(key);
      items.push(item);
    }
  }

  const sectors = [
    ...new Set(
      items
        .map((item) => item.sector)
        .filter(
          (value): value is string =>
            typeof value === "string" && value.length > 0,
        ),
    ),
  ].sort();

  return (
    <main>
      <header className="editorial-container py-12 md:py-16">
        <p className="eyebrow">Evidence workspace</p>

        <h1 className="mt-5 max-w-[12ch] font-display text-6xl leading-[0.9] tracking-[-0.06em] md:text-8xl">
          Compare the evidence before deciding what deserves attention.
        </h1>

        <p className="mt-6 max-w-2xl text-base leading-7 text-[var(--ink-muted)]">
          Reorder the universe by the question you care about, compare up
          to four companies, and inspect the exact components and
          percentiles behind each result.
        </p>
      </header>

      <DiscoveryExperience
        items={items}
        sectors={sectors}
        categories={Object.keys(data.sections)}
      />
    </main>
  );
}
