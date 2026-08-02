import "server-only";

import { cache } from "react";
import { loadJson } from "@/lib/data/load-json";
import type {
  DiscoveriesData,
  DiscoveryItem,
} from "@/types/home";
import type {
  CompanyDossier,
  CompanyIndexData,
  CompanyIndexItem,
  CompanyStoryData,
  InsiderDossier,
  InsiderIndexData,
  MethodologyData,
  StatusData,
} from "@/types/interior";

const loadRawCompanyIndex = cache(() =>
  loadJson<CompanyIndexData>("companies/index.json"),
);

export const loadDiscoveries = cache(() =>
  loadJson<DiscoveriesData>("discoveries.json"),
);

function normalizeIdentity(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  const normalized = String(value).trim().toLowerCase();

  if (
    !normalized ||
    normalized === "nan" ||
    normalized === "none" ||
    normalized === "null" ||
    normalized === "undefined"
  ) {
    return "";
  }

  return normalized;
}

function evidenceKeys(item: {
  issuer_cik?: unknown;
  ticker?: unknown;
  company_name?: unknown;
}): string[] {
  const issuerCik = normalizeIdentity(item.issuer_cik);
  const ticker = normalizeIdentity(item.ticker);
  const companyName = normalizeIdentity(item.company_name);

  return [
    issuerCik ? `cik:${issuerCik}` : "",
    ticker ? `ticker:${ticker}` : "",
    companyName ? `name:${companyName}` : "",
  ].filter(Boolean);
}

function discoveryItems(
  discoveries: DiscoveriesData,
): DiscoveryItem[] {
  const items: DiscoveryItem[] = [];

  for (const section of Object.values(
    discoveries.sections ?? {},
  )) {
    for (const item of section.items ?? []) {
      items.push(item);
    }
  }

  return items;
}

function companyHasDiscoveryEvidence(
  company: CompanyIndexItem,
  keys: Set<string>,
): boolean {
  return evidenceKeys(company).some((key) =>
    keys.has(key),
  );
}

export function hasCompanyEvidence(
  dossier: CompanyDossier,
): boolean {
  const purchaseEventCount =
    dossier.stats?.purchase_event_count ?? 0;

  const totalPurchaseValue =
    dossier.stats?.total_purchase_value ?? 0;

  return (
    purchaseEventCount > 0 ||
    totalPurchaseValue > 0 ||
    dossier.purchase_events.length > 0 ||
    dossier.purchase_campaigns.length > 0 ||
    dossier.event_signals.length > 0 ||
    dossier.qualifying_transactions.length > 0 ||
    Boolean(dossier.latest_event_signal) ||
    Boolean(dossier.current_signal)
  );
}

export const loadCompanyIndex = cache(
  async (): Promise<CompanyIndexData> => {
    const [index, discoveries] = await Promise.all([
      loadRawCompanyIndex(),
      loadDiscoveries(),
    ]);

    const keys = new Set<string>();

    for (const item of discoveryItems(discoveries)) {
      for (const key of evidenceKeys(item)) {
        keys.add(key);
      }
    }

    const items = index.items
      .filter((company) =>
        companyHasDiscoveryEvidence(company, keys),
      )
      .sort((left, right) => {
        const leftTicker = normalizeIdentity(left.ticker);
        const rightTicker = normalizeIdentity(right.ticker);

        return leftTicker.localeCompare(rightTicker);
      });

    return {
      ...index,
      count: items.length,
      items,
    };
  },
);

export const loadCompanyDossier = cache(
  (slug: string) =>
    loadJson<CompanyDossier>(
      `companies/${slug}.json`,
    ),
);


export const loadCompanyStory = cache(
  (slug: string) =>
    loadJson<CompanyStoryData>(
      `company-stories/${slug}.json`,
    ),
);

export const loadInsiderIndex = cache(() =>
  loadJson<InsiderIndexData>("insiders/index.json"),
);

export const loadInsiderDossier = cache(
  (slug: string) =>
    loadJson<InsiderDossier>(
      `insiders/${slug}.json`,
    ),
);

export const loadMethodology = cache(() =>
  loadJson<MethodologyData>("methodology.json"),
);

export const loadStatus = cache(() =>
  loadJson<StatusData>("status.json"),
);
