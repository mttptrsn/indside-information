import { Reveal } from "@/components/motion/reveal";
import { StatCallout } from "@/components/editorial/stat-callout";
import { SectionHeader } from "@/components/editorial/section-header";
import {
  formatCurrency,
  formatNumber,
  formatScore,
} from "@/lib/format";
import type { OverviewData } from "@/types/home";

export function ExecutiveActivity({
  overview,
}: {
  overview: OverviewData;
}) {
  const metrics = [
    {
      label: "Qualifying purchases",
      value: formatNumber(overview.counts.qualifying_purchases),
      context: "Open-market, non-derivative purchases that passed validation.",
    },
    {
      label: "Active company signals",
      value: formatNumber(overview.counts.company_signals),
      context: "Companies with current behavioral evidence.",
    },
    {
      label: "Median conviction",
      value: formatScore(overview.market_pulse.median_conviction),
      context: "Strength of evidence after context and penalties.",
    },
    {
      label: "Reported purchase value",
      value: formatCurrency(
        overview.market_pulse.total_reported_purchase_value,
      ),
      context: "Aggregate reported value across grouped purchase events.",
    },
  ];

  return (
    <section id="today" className="section-space editorial-container">
      <SectionHeader
        eyebrow="01 · Today’s executive activity"
        title="The filing volume is ordinary. The behavior is not."
        description="Thousands of transaction rows collapse into a smaller set of human decisions worth investigating."
      />

      <div className="mt-16 grid gap-x-8 gap-y-10 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric, index) => (
          <Reveal key={metric.label} delay={index * 0.06}>
            <StatCallout {...metric} />
          </Reveal>
        ))}
      </div>
    </section>
  );
}
