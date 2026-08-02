import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Reveal } from "@/components/motion/reveal";
import { PullQuote } from "@/components/editorial/pull-quote";
import { formatMultiple, formatScore, slugifyTicker } from "@/lib/format";
import type { DiscoveryItem } from "@/types/home";

export function BehaviorChange({
  items,
}: {
  items: DiscoveryItem[];
}) {
  const selected = [...items]
    .sort(
      (a, b) =>
        (b.behavior_change_score ?? 0) -
        (a.behavior_change_score ?? 0),
    )
    .slice(0, 5);

  const lead = selected[0];

  return (
    <section className="section-space editorial-container">
      <PullQuote
        quote="The purchase matters. The change in behavior matters more."
        attribution="Editorial principle"
      />

      <div className="mt-20 grid gap-12 lg:grid-cols-12">
        <Reveal className="lg:col-span-5">
          <div className="home-image aspect-[4/5]">
            <Image
              src="/editorial/filing-desk.jpg"
              alt="Monochrome documentary composition of filings and a signature."
              fill
              sizes="(max-width: 1023px) 100vw, 42vw"
            />
          </div>
        </Reveal>

        <div className="lg:col-span-7 lg:pl-8">
          <Reveal delay={0.06}>
            <p className="eyebrow">09 · Behavior changes</p>
            <h2 className="mt-6 max-w-[11ch] font-display text-5xl leading-[0.94] tracking-[-0.045em] md:text-7xl">
              The people behind the filings.
            </h2>
            <p className="mt-7 max-w-xl text-lg leading-8 text-[var(--ink-muted)]">
              A large purchase is not automatically unusual. The strongest
              stories begin when an executive acts differently from their own
              established pattern.
            </p>
          </Reveal>

          {lead ? (
            <Reveal delay={0.12} className="mt-14 border-t border-[var(--line)] pt-6">
              <Link
                href={`/companies/${slugifyTicker(lead.ticker)}`}
                className="group block"
              >
                <p className="eyebrow">Highest current behavior change</p>
                <h3 className="mt-5 font-display text-4xl leading-[0.98] tracking-[-0.035em] md:text-5xl">
                  {lead.headline}
                </h3>
                <div className="mt-8 flex flex-wrap gap-x-10 gap-y-5">
                  <Measure label="Score" value={formatScore(lead.behavior_change_score)} />
                  <Measure label="Prior median" value={formatMultiple(lead.purchase_multiple)} />
                  <Measure label="Company" value={lead.ticker ?? "—"} />
                </div>
                <span className="mt-9 inline-flex items-center gap-3 text-sm">
                  Follow the evidence
                  <ArrowRight
                    className="size-4 transition-transform group-hover:translate-x-1"
                    aria-hidden="true"
                  />
                </span>
              </Link>
            </Reveal>
          ) : null}

          <div className="mt-12 grid gap-6 border-t border-[var(--line)] pt-6 sm:grid-cols-2">
            {selected.slice(1).map((item) => (
              <Link
                key={`${item.ticker}-${item.headline}`}
                href={`/companies/${slugifyTicker(item.ticker)}`}
                className="border-t border-[var(--line)] pt-4"
              >
                <p className="font-mono text-xs uppercase tracking-[0.12em] text-[var(--ink-soft)]">
                  {item.ticker} · {formatScore(item.behavior_change_score)}
                </p>
                <p className="mt-3 font-display text-2xl leading-tight">
                  {item.headline}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Measure({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="eyebrow">{label}</p>
      <p className="mt-2 font-mono text-lg">{value}</p>
    </div>
  );
}
