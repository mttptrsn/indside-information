import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Reveal } from "@/components/motion/reveal";
import { SectionHeader } from "@/components/editorial/section-header";
import {
  formatCurrency,
  formatNumber,
  formatScore,
} from "@/lib/format";
import type { SectorItem } from "@/types/home";

export function SectorActivity({ sectors }: { sectors: SectorItem[] }) {
  const selected = [...sectors]
    .sort(
      (a, b) =>
        (b.median_conviction ?? 0) - (a.median_conviction ?? 0) ||
        b.purchase_value! - a.purchase_value!,
    )
    .slice(0, 8);

  const maximum = Math.max(
    ...selected.map((sector) => sector.purchase_value ?? 0),
    1,
  );

  return (
    <section className="section-space editorial-container">
      <SectionHeader
        eyebrow="07 · Sector activity"
        title="Where personal capital is concentrating."
        description="Not a market forecast. A view of where independent executive decisions are clustering."
      />

      <div className="mt-16 border-y border-[var(--line)]">
        {selected.map((sector, index) => {
          const width = Math.max(
            3,
            ((sector.purchase_value ?? 0) / maximum) * 100,
          );

          return (
            <Reveal key={sector.sector} delay={index * 0.035}>
              <div className="group relative grid gap-4 border-b border-[var(--line)] py-6 last:border-b-0 md:grid-cols-12 md:items-center">
                <div
                  className="absolute inset-y-0 left-0 -z-10 bg-[color-mix(in_srgb,var(--accent)_8%,transparent)] transition-[width] duration-1000"
                  style={{ width: `${width}%` }}
                  aria-hidden="true"
                />
                <span className="font-mono text-xs text-[var(--ink-soft)] md:col-span-1">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h3 className="font-display text-3xl tracking-[-0.03em] md:col-span-4 md:text-4xl">
                  {sector.sector}
                </h3>
                <p className="text-sm text-[var(--ink-muted)] md:col-span-2">
                  {formatNumber(sector.company_count)} companies
                </p>
                <p className="font-mono text-sm md:col-span-2">
                  {formatCurrency(sector.purchase_value)}
                </p>
                <p className="font-mono text-sm md:col-span-2">
                  Conviction {formatScore(sector.median_conviction)}
                </p>
                <Link
                  href={`/sectors?sector=${encodeURIComponent(sector.sector)}`}
                  className="justify-self-start md:justify-self-end"
                  aria-label={`Explore ${sector.sector}`}
                >
                  <ArrowUpRight
                    className="size-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                    aria-hidden="true"
                  />
                </Link>
              </div>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}
