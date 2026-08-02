import "server-only";

import { loadJson } from "@/lib/data/load-json";
import {
  loadCompanyIndex,
  loadDiscoveries,
} from "@/lib/data/interiors";
import type { ActivitySourceEvent } from "@/types/activity";
import type { DiscoveryItem } from "@/types/home";

type UnknownRecord = Record<string, unknown>;

function text(value: unknown): string {
  const result = String(value ?? "").trim();

  return ["", "none", "null", "nan", "undefined"].includes(
    result.toLowerCase(),
  )
    ? ""
    : result;
}

function numberValue(value: unknown): number {
  const result = Number(value);
  return Number.isFinite(result) ? result : 0;
}

function recordsFromPayload(payload: unknown): UnknownRecord[] {
  if (Array.isArray(payload)) {
    return payload.filter(
      (item): item is UnknownRecord =>
        Boolean(item) && typeof item === "object",
    );
  }

  if (!payload || typeof payload !== "object") {
    return [];
  }

  const record = payload as UnknownRecord;

  for (const key of [
    "items",
    "events",
    "activity",
    "records",
    "rows",
    "daily_activity",
  ]) {
    if (Array.isArray(record[key])) {
      return recordsFromPayload(record[key]);
    }
  }

  if (Array.isArray(record.days)) {
    return record.days.flatMap((day) => {
      if (!day || typeof day !== "object") {
        return [];
      }

      const dayRecord = day as UnknownRecord;
      const date = text(
        dayRecord.date ??
          dayRecord.filing_date ??
          dayRecord.as_of_date,
      );

      const children = recordsFromPayload(
        dayRecord.items ??
          dayRecord.events ??
          dayRecord.activity ??
          dayRecord.records ??
          [],
      );

      return children.map((child) => ({
        ...child,
        date: text(child.date) || date,
        filing_date:
          text(child.filing_date) || date,
      }));
    });
  }

  return [];
}

function validTicker(value: unknown): string {
  const ticker = text(value).toUpperCase();

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
}

export async function loadActivityPageData(): Promise<
  ActivitySourceEvent[]
> {
  const [activityPayload, discoveries, companyIndex] =
    await Promise.all([
      loadJson<unknown>("activity/daily.json").catch(
        () => null,
      ),
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

  const discoveryRows: DiscoveryItem[] =
    Object.values(discoveries.sections).flatMap(
      (section) => section.items,
    );

  const discoveryRecords: UnknownRecord[] =
    discoveryRows.map((item) => ({
      ...item,
    }));

  const rawRows: UnknownRecord[] = [
    ...recordsFromPayload(activityPayload),
    ...discoveryRecords,
  ];

  const deduped = new Map<string, ActivitySourceEvent>();

  for (const raw of rawRows) {
    const rawTicker = validTicker(raw.ticker);
    const issuerCik = text(raw.issuer_cik);

    const company =
      (issuerCik
        ? byCik.get(issuerCik)
        : undefined) ??
      (rawTicker
        ? byTicker.get(rawTicker)
        : undefined);

    if (!company?.slug) {
      continue;
    }

    const ticker = validTicker(company.ticker);

    if (!ticker) {
      continue;
    }

    const filingDate = text(
      raw.filing_date ??
        raw.date ??
        raw.as_of_date ??
        raw.transaction_date,
    );

    const transactionDate = text(
      raw.transaction_date ??
        raw.as_of_date ??
        raw.date ??
        raw.filing_date,
    );

    if (!filingDate && !transactionDate) {
      continue;
    }

    const event: ActivitySourceEvent = {
      date: filingDate || transactionDate,
      transaction_date:
        transactionDate || filingDate,
      filing_date: filingDate || transactionDate,
      ticker,
      company_name:
        text(company.company_name) ||
        text(raw.company_name) ||
        ticker,
      issuer_cik:
        text(company.issuer_cik) || issuerCik,
      owner_cik: text(
        raw.owner_cik ?? raw.insider_id,
      ),
      owner_name: text(raw.owner_name),
      sector:
        text(company.sector) ||
        text(raw.sector),
      industry:
        text(company.industry) ||
        text(raw.industry),
      purchase_value: numberValue(
        raw.purchase_value ??
          raw.current_purchase_value ??
          raw.total_reported_purchase_value ??
          raw.reported_value,
      ),
      buyer_count: Math.max(
        1,
        numberValue(raw.buyer_count),
      ),
      conviction_score: numberValue(
        raw.conviction_score ?? raw.score,
      ),
      behavior_change_score: numberValue(
        raw.behavior_change_score,
      ),
      cluster_score: numberValue(
        raw.cluster_score,
      ),
      silence_break_score: numberValue(
        raw.silence_break_score,
      ),
      days_since_previous_purchase: numberValue(
        raw.days_since_previous_purchase,
      ),
      headline: text(raw.headline),
      company_slug: company.slug,
      story_summary:
        company.story_summary ?? null,
    };

    const key = [
      event.filing_date,
      event.transaction_date,
      event.issuer_cik,
      event.ticker,
      event.owner_cik || event.owner_name,
      event.purchase_value,
    ].join("|");

    if (!deduped.has(key)) {
      deduped.set(key, event);
    }
  }

  return [...deduped.values()];
}
