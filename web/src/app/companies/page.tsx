import type { Metadata } from "next";
import { CompanyIndex } from "@/components/company/company-index";
import { loadCompanyIndex } from "@/lib/data/interiors";

export const metadata: Metadata = {
  title: "Companies",
  description:
    "Browse companies with qualifying open-market executive purchase evidence.",
};

export default async function CompaniesPage() {
  const data = await loadCompanyIndex();

  return (
    <>
      <header className="editorial-container py-12 md:py-16">
        <p className="eyebrow">
          Companies with evidence
        </p>

        <h1 className="mt-5 max-w-[11ch] font-display text-6xl leading-[0.9] tracking-[-0.06em] md:text-8xl">
          Every company here has qualifying insider buying.
        </h1>

        <p className="mt-6 max-w-xl text-sm leading-6 text-[var(--ink-muted)]">
          {data.count.toLocaleString("en-US")} companies
          have at least one qualifying open-market purchase
          in the current evidence set.
        </p>
      </header>

      <CompanyIndex companies={data.items} />
    </>
  );
}
