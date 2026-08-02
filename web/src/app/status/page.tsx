import type { Metadata } from "next";
import { StatusReport } from "@/components/status/status-report";
import { loadJson } from "@/lib/data/load-json";
import {
  loadCompanyIndex,
  loadStatus,
} from "@/lib/data/interiors";
import type { StatusData } from "@/types/interior";

interface ManifestData {
  generated_at_utc?: string;
  as_of_date?: string;
  freshness?: {
    latest_sec_filing_date?: string;
    latest_price_date?: string;
    exported_at_utc?: string;
  };
}

type StatusRecord = StatusData &
  Record<string, unknown> & {
    overall_status?: string;
    latest_sec_filing_date?: string;
    latest_price_date?: string;
    latest_ranking_generation_time?: string;
  };

export const metadata: Metadata = {
  title: "Data Status",
  description:
    "Pipeline freshness, artifact counts, quality and limitations.",
};

function usableText(value: unknown): string {
  const result = String(value ?? "").trim();

  if (
    !result ||
    ["none", "null", "nan", "undefined"].includes(
      result.toLowerCase(),
    )
  ) {
    return "";
  }

  return result;
}

function normalizedDate(value: unknown): string {
  const raw = usableText(value);

  if (!raw) {
    return "";
  }

  const compact = raw.match(
    /^(\d{4})(\d{2})(\d{2})$/,
  );

  if (compact) {
    const [, year, month, day] = compact;
    return `${year}-${month}-${day}`;
  }

  const iso = raw.match(
    /^(\d{4}-\d{2}-\d{2})/,
  );

  return iso ? iso[1] : "";
}

function latestDate(
  values: unknown[],
): string {
  const dates = values
    .map(normalizedDate)
    .filter(Boolean)
    .sort();

  return dates.at(-1) ?? "";
}

export default async function StatusPage() {
  const [
    loadedStatus,
    companyIndex,
  ] = await Promise.all([
    loadStatus() as Promise<StatusRecord>,
    loadCompanyIndex(),
  ]);

  let manifest: ManifestData = {};

  try {
    manifest =
      await loadJson<ManifestData>(
        "manifest.json",
      );
  } catch {
    manifest = {};
  }

  const statusFreshness =
    loadedStatus.freshness ?? {};

  const manifestFreshness =
    manifest.freshness ?? {};

  const companyStoryPriceDate =
    latestDate(
      companyIndex.items.map(
        (company) =>
          company.story_summary
            ?.price_date,
      ),
    );

  const latestPriceDate =
    companyStoryPriceDate ||
    normalizedDate(
      statusFreshness.latest_price_date,
    ) ||
    normalizedDate(
      loadedStatus.latest_price_date,
    ) ||
    normalizedDate(
      manifestFreshness.latest_price_date,
    );

  const overallStatus =
    usableText(
      loadedStatus.pipeline
        ?.overall_status,
    ) ||
    usableText(
      loadedStatus.overall_status,
    ) ||
    "complete";

  const data: StatusData = {
    ...loadedStatus,
    generated_at_utc:
      usableText(
        loadedStatus.generated_at_utc,
      ) ||
      usableText(
        manifest.generated_at_utc,
      ),
    as_of_date:
      normalizedDate(
        loadedStatus.as_of_date,
      ) ||
      normalizedDate(
        manifest.as_of_date,
      ) ||
      normalizedDate(
        loadedStatus.latest_sec_filing_date,
      ),
    pipeline: {
      ...loadedStatus.pipeline,
      overall_status: overallStatus,
    },
    freshness: {
      ...manifestFreshness,
      ...statusFreshness,
      latest_sec_filing_date:
        normalizedDate(
          statusFreshness.latest_sec_filing_date,
        ) ||
        normalizedDate(
          loadedStatus.latest_sec_filing_date,
        ) ||
        normalizedDate(
          manifestFreshness.latest_sec_filing_date,
        ) ||
        normalizedDate(
          loadedStatus.as_of_date,
        ),
      latest_price_date:
        latestPriceDate,
      exported_at_utc:
        usableText(
          statusFreshness.exported_at_utc,
        ) ||
        usableText(
          loadedStatus.latest_ranking_generation_time,
        ) ||
        usableText(
          manifestFreshness.exported_at_utc,
        ) ||
        usableText(
          loadedStatus.generated_at_utc,
        ) ||
        usableText(
          manifest.generated_at_utc,
        ),
    },
  };

  return <StatusReport data={data} />;
}
