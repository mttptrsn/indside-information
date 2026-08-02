import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CompanyProfile } from "@/components/company/company-profile";
import {
  hasCompanyEvidence,
  loadCompanyDossier,
  loadCompanyIndex,
  loadCompanyStory,
} from "@/lib/data/interiors";
import { text } from "@/lib/record";
import type { CompanyStoryData } from "@/types/interior";

export async function generateStaticParams() {
  const index = await loadCompanyIndex();

  return index.items.map((company) => ({
    ticker: company.slug,
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ ticker: string }>;
}): Promise<Metadata> {
  const { ticker } = await params;

  const dossier = await loadCompanyDossier(
    ticker,
  ).catch(() => null);

  if (!dossier || !hasCompanyEvidence(dossier)) {
    return {
      title: "Company evidence unavailable",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const name =
    text(
      dossier.company,
      "company_name",
      "issuer_name",
    ) || ticker.toUpperCase();

  return {
    title: name,
    description: `Executive purchase evidence, price context, and behavioral history for ${name}.`,
  };
}

export default async function CompanyPage({
  params,
}: {
  params: Promise<{ ticker: string }>;
}) {
  const { ticker } = await params;

  const [dossier, story, index] = await Promise.all([
    loadCompanyDossier(ticker).catch(() => null),
    loadCompanyStory(ticker).catch(() => null),
    loadCompanyIndex(),
  ]);

  if (!dossier || !hasCompanyEvidence(dossier)) {
    notFound();
  }

  const fallbackStory: CompanyStoryData = {
    schema_version: dossier.schema_version,
    generated_at_utc: dossier.generated_at_utc,
    as_of_date: dossier.as_of_date,
    freshness: dossier.freshness,
    ticker: text(
      dossier.company,
      "primary_ticker",
      "ticker",
      "yf_ticker",
    ),
    issuer_cik: text(
      dossier.company,
      "issuer_cik",
    ),
    company_name: text(
      dossier.company,
      "company_name",
      "issuer_name",
    ),
    price_available: false,
    price_unavailable_reason:
      "company_story_missing",
    price_path: [],
    purchase_markers: [],
    summary: {},
    limitations: [
      "The company story export was not available for this profile.",
    ],
  };

  const sector = text(dossier.company, "sector");
  const currentCik = text(
    dossier.company,
    "issuer_cik",
  );

  const related = index.items
    .filter(
      (company) =>
        company.issuer_cik !== currentCik &&
        Boolean(sector) &&
        company.sector === sector,
    )
    .slice(0, 6);

  return (
    <CompanyProfile
      dossier={dossier}
      story={story ?? fallbackStory}
      related={related}
    />
  );
}
