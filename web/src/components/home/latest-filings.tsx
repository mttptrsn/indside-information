import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Reveal } from "@/components/motion/reveal";
import { SectionHeader } from "@/components/editorial/section-header";
import {
  formatCurrency,
  formatDate,
  slugifyTicker,
} from "@/lib/format";
import type { DiscoveryItem, HeartbeatItem } from "@/types/home";

interface FilingStory {
  id: string;
  ticker?: string | null;
  company?: string | null;
  insider?: string | null;
  headline?: string | null;
  date?: string | null;
  value?: number | null;
}

function buildStories(
  heartbeat: HeartbeatItem[],
  ranked: DiscoveryItem[],
): FilingStory[] {
  const stories: FilingStory[] = [];
  const seen = new Set<string>();

  for (const beat of [...heartbeat].reverse()) {
    const key = `${beat.ticker}-${beat.date}-${beat.insider_name}`;
    if (!beat.ticker || seen.has(key)) continue;
    seen.add(key);
    stories.push({
      id: beat.event_id ?? key,
      ticker: beat.ticker,
      company: beat.company_name,
      insider: beat.insider_name,
      headline: beat.headline,
      date: beat.date,
      value: beat.purchase_value,
    });
    if (stories.length >= 6) return stories;
  }

  for (const item of ranked) {
    const key = `${item.ticker}-${item.filing_date}-${item.headline}`;
    if (!item.ticker || seen.has(key)) continue;
    seen.add(key);
    stories.push({
      id: key,
      ticker: item.ticker,
      company: item.company_name,
      headline: item.headline,
      date: item.filing_date ?? item.transaction_date,
      value: item.purchase_value,
    });
    if (stories.length >= 6) break;
  }

  return stories;
}

export function LatestFilings({
  heartbeat,
  ranked,
}: {
  heartbeat: HeartbeatItem[];
  ranked: DiscoveryItem[];
}) {
  const stories = buildStories(heartbeat, ranked);

  return (
    <section className="section-space border-y border-[var(--line)] bg-[var(--surface)]">
      <div className="editorial-container">
        <SectionHeader
          eyebrow="08 · Latest filings"
          title="The newest evidence, read as decisions."
          description="A chronological editorial tape of recent purchase activity."
        />

        <div className="mt-16 divide-y divide-[var(--line)] border-y border-[var(--line)]">
          {stories.map((story, index) => (
            <Reveal key={story.id} delay={index * 0.04}>
              <Link
                href={`/companies/${slugifyTicker(story.ticker)}`}
                className="group grid gap-4 py-7 md:grid-cols-12 md:items-center"
              >
                <time className="font-mono text-xs uppercase tracking-[0.12em] text-[var(--ink-soft)] md:col-span-2">
                  {formatDate(story.date, {
                    month: "short",
                    day: "numeric",
                  })}
                </time>
                <div className="md:col-span-7">
                  <p className="eyebrow">
                    {story.ticker}
                    {story.company ? ` · ${story.company}` : ""}
                  </p>
                  <h3 className="mt-3 font-display text-3xl leading-[1] tracking-[-0.03em] md:text-4xl">
                    {story.headline ??
                      `${story.insider ?? "An executive"} disclosed an open-market purchase.`}
                  </h3>
                </div>
                <p className="font-mono text-sm md:col-span-2 md:text-right">
                  {formatCurrency(story.value)}
                </p>
                <ArrowUpRight
                  className="size-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 md:justify-self-end"
                  aria-hidden="true"
                />
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
