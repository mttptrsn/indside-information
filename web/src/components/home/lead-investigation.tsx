import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Reveal } from "@/components/motion/reveal";
import { Badge } from "@/components/ui/badge";
import {
  formatCurrency,
  formatDate,
  formatMultiple,
  formatScore,
  slugifyTicker,
  titleCaseCategory,
} from "@/lib/format";
import type { DiscoveryItem } from "@/types/home";

export function LeadInvestigation({
  item,
  supporting,
}: {
  item: DiscoveryItem;
  supporting: DiscoveryItem[];
}) {
  const href = `/companies/${slugifyTicker(item.ticker)}`;

  return (
    <section className="section-space border-y border-[var(--line)] bg-[var(--surface)]">
      <div className="editorial-container">
        <div className="grid gap-12 lg:grid-cols-12 lg:items-stretch">
          <Reveal className="lg:col-span-7">
            <Link href={href} className="group block">
              <div className="home-image aspect-[4/3] lg:aspect-[5/4]">
                <Image
                  src="/editorial/architecture.jpg"
                  alt="Monochrome architectural composition of a corporate tower."
                  fill
                  sizes="(max-width: 1023px) 100vw, 58vw"
                />
                <div className="absolute inset-x-0 bottom-0 z-10 flex items-end justify-between gap-6 p-6 text-[#f1eee7] md:p-8">
                  <span className="font-mono text-xs uppercase tracking-[0.14em]">
                    Investigation {String(item.rank ?? "01").padStart(2, "0")}
                  </span>
                  <ArrowUpRight className="size-5 transition-transform duration-500 group-hover:translate-x-1 group-hover:-translate-y-1" />
                </div>
              </div>
            </Link>
          </Reveal>

          <div className="flex flex-col justify-between lg:col-span-5">
            <Reveal delay={0.08}>
              <Badge tone="accent">
                {titleCaseCategory(item.category ?? "Most convincing purchase")}
              </Badge>
              <h2 className="mt-8 max-w-[12ch] font-display text-5xl leading-[0.95] tracking-[-0.045em] md:text-7xl">
                {item.headline ?? "A purchase worth a closer reading."}
              </h2>
              <p className="mt-7 text-lg leading-8 text-[var(--ink-muted)]">
                {item.ticker ? `${item.ticker} · ` : ""}
                {item.company_name ?? "Company identity unavailable"}
              </p>
            </Reveal>

            <Reveal delay={0.16} className="mt-12">
              <div className="grid grid-cols-2 gap-x-6 gap-y-8 border-t border-[var(--line)] pt-5">
                <Evidence label="Reported value" value={formatCurrency(item.purchase_value)} />
                <Evidence label="Conviction" value={formatScore(item.conviction_score)} />
                <Evidence label="Historical comparison" value={formatMultiple(item.purchase_multiple)} />
                <Evidence label="Transaction date" value={formatDate(item.transaction_date)} />
              </div>
              <Link
                href={href}
                className="mt-10 inline-flex items-center gap-3 border-b border-[var(--ink)] pb-1 text-sm"
              >
                Open the company dossier
                <ArrowUpRight className="size-4" aria-hidden="true" />
              </Link>
            </Reveal>
          </div>
        </div>

        {supporting.length ? (
          <div className="mt-20 grid gap-8 border-t border-[var(--line)] pt-8 md:grid-cols-3">
            {supporting.slice(0, 3).map((signal, index) => (
              <Reveal key={`${signal.category}-${signal.ticker}-${index}`} delay={index * 0.06}>
                <Link
                  href={`/companies/${slugifyTicker(signal.ticker)}`}
                  className="group block"
                >
                  <p className="eyebrow">
                    {titleCaseCategory(signal.category ?? "Evidence")}
                  </p>
                  <h3 className="mt-5 font-display text-3xl leading-[1] tracking-[-0.035em]">
                    {signal.headline ?? "A new behavioral signal"}
                  </h3>
                  <p className="mt-5 text-sm leading-6 text-[var(--ink-muted)]">
                    {signal.ticker} · {formatCurrency(signal.purchase_value)}
                  </p>
                  <span className="mt-7 inline-flex items-center gap-2 text-sm">
                    Read
                    <ArrowUpRight className="size-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </span>
                </Link>
              </Reveal>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}

function Evidence({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="eyebrow">{label}</p>
      <p className="mt-2 font-mono text-lg tracking-[-0.03em]">{value}</p>
    </div>
  );
}
