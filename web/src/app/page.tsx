import type { Metadata } from "next";
import { Homepage } from "@/components/home/homepage";
import { loadHomeData } from "@/lib/data/home";
import { loadCompanyIndex } from "@/lib/data/interiors";
import type { DiscoveryItem, HomeData } from "@/types/home";
import type { CompanyIndexItem } from "@/types/interior";

export const metadata: Metadata = {
  title: "Inside Information",
  description:
    "Public insider buying disclosures organized into the companies whose executive behavior deserves attention now.",
};

function normalized(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  const result = String(value).trim();

  if (
    !result ||
    result.toLowerCase() === "nan" ||
    result.toLowerCase() === "none" ||
    result.toLowerCase() === "null" ||
    result.toLowerCase() === "undefined"
  ) {
    return "";
  }

  return result;
}

function buildCompanyLookup(
  companies: CompanyIndexItem[],
) {
  const byCik = new Map<string, CompanyIndexItem>();
  const byTicker = new Map<string, CompanyIndexItem>();

  for (const company of companies) {
    const cik = normalized(company.issuer_cik);
    const ticker = normalized(company.ticker).toUpperCase();

    if (cik) {
      byCik.set(cik, company);
    }

    if (ticker) {
      byTicker.set(ticker, company);
    }
  }

  return { byCik, byTicker };
}

function enrichDiscoveryItem(
  item: DiscoveryItem,
  lookup: ReturnType<typeof buildCompanyLookup>,
): DiscoveryItem {
  const cik = normalized(item.issuer_cik);
  const ticker = normalized(item.ticker).toUpperCase();

  const company =
    (cik ? lookup.byCik.get(cik) : undefined) ??
    (ticker ? lookup.byTicker.get(ticker) : undefined);

  if (!company) {
    return item;
  }

  return {
    ...item,
    ticker:
      normalized(item.ticker) ||
      normalized(company.ticker),
    issuer_cik:
      normalized(item.issuer_cik) ||
      normalized(company.issuer_cik),
    company_name:
      normalized(item.company_name) ||
      normalized(company.company_name),
    sector:
      normalized(item.sector) ||
      normalized(company.sector),
    industry:
      normalized(item.industry) ||
      normalized(company.industry),
    market_cap:
      item.market_cap ??
      company.market_cap ??
      null,
    price_available:
      company.price_available ??
      null,
    story_path:
      company.story_path ??
      null,
    story_summary:
      company.story_summary ??
      null,
  };
}

function enrichHomeData(
  data: HomeData,
  companies: CompanyIndexItem[],
): HomeData {
  const lookup = buildCompanyLookup(companies);

  const sections = Object.fromEntries(
    Object.entries(data.discoveries.sections).map(
      ([key, section]) => [
        key,
        {
          ...section,
          items: section.items.map((item) =>
            enrichDiscoveryItem(item, lookup),
          ),
        },
      ],
    ),
  );

  return {
    ...data,
    discoveries: {
      ...data.discoveries,
      sections,
    },
  };
}

export default async function HomePage() {
  const [data, companyIndex] = await Promise.all([
    loadHomeData(),
    loadCompanyIndex(),
  ]);

  return (
    <Homepage
      data={enrichHomeData(
        data,
        companyIndex.items,
      )}
    />
  );
}
