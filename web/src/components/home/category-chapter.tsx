import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Reveal } from "@/components/motion/reveal";
import { Badge } from "@/components/ui/badge";
import {
  formatCurrency,
  formatMultiple,
  formatPercent,
  formatScore,
  slugifyTicker,
} from "@/lib/format";
import type { DiscoveryItem } from "@/types/home";

const descriptions: Record<string, string> = {
  breaking_habits:
    "Purchases that diverge sharply from the executive’s established history.",
  quiet_buyers:
    "Executives returning after unusually long periods without an open-market purchase.",
  wolf_packs:
    "Independent operating insiders placing their own money behind the same company.",
  growing_positions:
    "Purchases that materially increase the insider’s reported ownership.",
  under_the_radar:
    "Smaller, eligible companies where conviction is easier to miss.",
};

const displayTitles: Record<string, string> = {
  breaking_habits: "Breaking habits",
  quiet_buyers: "Quiet buyers",
  wolf_packs: "Wolf packs",
  growing_positions: "Growing positions",
  under_the_radar: "Under the radar",
};

export function CategoryChapter({
  category,
  items,
  index,
  dark = false,
}: {
  category: string;
  items: DiscoveryItem[];
  index: string;
  dark?: boolean;
}) {
  if (!items.length) return null;

  const lead = items[0];
  const title = displayTitles[category] ?? category.replaceAll("_", " ");

  return (
    <section className={dark ? "ink-panel section-space" : "section-space"}>
      <div className="editorial-container">
        <div className="grid gap-12 lg:grid-cols-12">
          <Reveal className="lg:col-span-4">
            <p className={dark ? "eyebrow text-[color-mix(in_srgb,var(--canvas)_58%,transparent)]" : "eyebrow"}>
              {index} · {title}
            </p>
            <h2 className="mt-6 font-display text-5xl leading-[0.94] tracking-[-0.045em] md:text-7xl">
              {title}.
            </h2>
            <p
              className={`mt-6 max-w-md text-base leading-7 ${
                dark ? "muted-on-ink" : "text-[var(--ink-muted)]"
              }`}
            >
              {descriptions[category]}
            </p>
            <Link
              href={`/discoveries?category=${category}`}
              className="mt-9 inline-flex items-center gap-3 border-b border-current pb-1 text-sm"
            >
              See the full ranking
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </Reveal>

          <div className="lg:col-span-8">
            <Reveal delay={0.06}>
              <Link
                href={`/companies/${slugifyTicker(lead.ticker)}`}
                className={`group block border-t pt-5 ${
                  dark
                    ? "border-[color-mix(in_srgb,var(--canvas)_18%,transparent)]"
                    : "border-[var(--line)]"
                }`}
              >
                <div className="flex items-start justify-between gap-6">
                  <Badge tone={dark ? "neutral" : "accent"}>
                    {lead.ticker ?? "Evidence"}
                  </Badge>
                  <span className="font-mono text-xs uppercase tracking-[0.13em] opacity-60">
                    Conviction {formatScore(lead.conviction_score)}
                  </span>
                </div>
                <h3 className="mt-10 max-w-[16ch] font-display text-5xl leading-[0.96] tracking-[-0.04em] md:text-6xl">
                  {lead.headline}
                </h3>
                <div className="mt-10 grid gap-6 sm:grid-cols-3">
                  <MiniEvidence label="Purchase" value={formatCurrency(lead.purchase_value)} />
                  <MiniEvidence
                    label="Historical"
                    value={formatMultiple(lead.purchase_multiple)}
                  />
                  <MiniEvidence
                    label="Ownership"
                    value={formatPercent(lead.ownership_increase_percent)}
                  />
                </div>
              </Link>
            </Reveal>

            <div
              className={`mt-12 divide-y ${
                dark
                  ? "divide-[color-mix(in_srgb,var(--canvas)_14%,transparent)] border-y border-[color-mix(in_srgb,var(--canvas)_14%,transparent)]"
                  : "divide-[var(--line)] border-y border-[var(--line)]"
              }`}
            >
              {items.slice(1, 4).map((item, itemIndex) => (
                <Reveal
                  key={`${category}-${item.ticker}-${itemIndex}`}
                  delay={0.08 + itemIndex * 0.05}
                >
                  <Link
                    href={`/companies/${slugifyTicker(item.ticker)}`}
                    className="group grid gap-3 py-6 md:grid-cols-12 md:items-center"
                  >
                    <span className="font-mono text-xs opacity-55 md:col-span-1">
                      {String(itemIndex + 2).padStart(2, "0")}
                    </span>
                    <h4 className="font-display text-2xl leading-tight md:col-span-7 md:text-3xl">
                      {item.headline}
                    </h4>
                    <span className="text-sm opacity-65 md:col-span-2 md:text-right">
                      {item.ticker}
                    </span>
                    <span className="font-mono text-sm md:col-span-2 md:text-right">
                      {formatCurrency(item.purchase_value)}
                    </span>
                  </Link>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function MiniEvidence({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[0.6875rem] uppercase tracking-[0.16em] opacity-55">
        {label}
      </p>
      <p className="mt-2 font-mono text-lg tracking-[-0.025em]">{value}</p>
    </div>
  );
}
