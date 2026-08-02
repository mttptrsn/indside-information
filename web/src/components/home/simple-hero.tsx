import Link from "next/link";
import { ArrowDownRight } from "lucide-react";
import { formatCurrency, formatNumber } from "@/lib/format";
import type { OverviewData } from "@/types/home";

export function SimpleHero({
  overview,
}: {
  overview: OverviewData;
}) {
  return (
    <section className="border-b border-[var(--line)]">
      <div className="editorial-container grid min-h-[72svh] gap-10 py-14 md:grid-cols-12 md:items-end md:py-20">
        <div className="md:col-span-9">
          <p className="eyebrow">
            Public filings. Hidden in plain sight.
          </p>

          <h1 className="mt-7 font-display text-[clamp(5rem,13vw,12rem)] leading-[0.72] tracking-[-0.075em]">
            <span className="block">Inside</span>
            <span className="block">Information</span>
          </h1>
        </div>

        <div className="md:col-span-3 md:pb-2">
          <p className="max-w-sm text-lg leading-8 text-[var(--ink-muted)]">
            Every executive purchase is public. Almost nobody assembles the
            complete story.
          </p>

          <p className="mt-5 max-w-sm text-sm leading-6 text-[var(--ink-soft)]">
            We organize insider buying disclosures into the companies,
            people, and behavior changes worth investigating.
          </p>

          <Link
            href="#reading-list"
            className="mt-8 inline-flex items-center gap-3 border-b border-[var(--ink)] pb-1 text-sm"
          >
            Explore today&apos;s evidence
            <ArrowDownRight className="size-4" />
          </Link>
        </div>

        <div className="grid gap-6 border-t border-[var(--line)] pt-6 sm:grid-cols-3 md:col-span-12">
          <Stat
            value={formatCurrency(
              overview.market_pulse.total_reported_purchase_value,
            )}
            label="reported executive buying"
          />

          <Stat
            value={formatNumber(
              overview.market_pulse.active_company_count,
            )}
            label="companies with activity"
          />

          <Stat
            value={formatNumber(
              overview.counts.purchase_events,
            )}
            label="qualifying purchase events"
          />
        </div>
      </div>
    </section>
  );
}

function Stat({
  value,
  label,
}: {
  value: string;
  label: string;
}) {
  return (
    <div>
      <p className="font-display text-4xl leading-none">
        {value}
      </p>

      <p className="mt-2 text-sm text-[var(--ink-muted)]">
        {label}
      </p>
    </div>
  );
}
