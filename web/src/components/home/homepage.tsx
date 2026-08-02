import { ActivityCalendar } from "@/components/visuals/activity-calendar";
import { ExecutiveConvictionLadder } from "@/components/visuals/executive-conviction-ladder";
import { SimpleHero } from "@/components/home/simple-hero";
import type { DiscoveryItem, HomeData } from "@/types/home";

function allRankedItems(data: HomeData): DiscoveryItem[] {
  const seen = new Set<string>();
  const items: DiscoveryItem[] = [];

  for (const section of Object.values(data.discoveries.sections)) {
    for (const item of section.items) {
      const key = [
        item.issuer_cik,
        item.ticker,
        item.company_name,
      ]
        .filter(Boolean)
        .join("|")
        .toLowerCase();

      if (!key || seen.has(key)) {
        continue;
      }

      seen.add(key);
      items.push(item);
    }
  }

  return items;
}

export function Homepage({ data }: { data: HomeData }) {
  const items = allRankedItems(data);

  return (
    <>
      <SimpleHero overview={data.overview} />

      <section
        id="reading-list"
        className="section-space"
      >
        <div className="editorial-container">
          <div className="mb-10 grid gap-6 md:grid-cols-12 md:items-end">
            <div className="md:col-span-8">
              <p className="eyebrow">
                Today&apos;s reading list
              </p>

              <h2 className="mt-4 max-w-[12ch] font-display text-5xl leading-[0.94] tracking-[-0.05em] md:text-7xl">
                Start with the companies showing the strongest combined evidence.
              </h2>
            </div>

            <p className="max-w-sm text-sm leading-6 text-[var(--ink-muted)] md:col-span-4 md:justify-self-end">
              Ranked by coordinated buying, unusual behavior, executive
              commitment, and data quality.
            </p>
          </div>

          <ExecutiveConvictionLadder
            items={items}
            limit={6}
            compact
          />
        </div>
      </section>

      <section className="section-space border-y border-[var(--line)] bg-[var(--surface)]">
        <div className="editorial-container">
          <div className="mb-10 grid gap-6 md:grid-cols-12 md:items-end">
            <div className="md:col-span-8">
              <p className="eyebrow">
                When conviction appeared
              </p>

              <h2 className="mt-4 max-w-[11ch] font-display text-5xl leading-[0.94] tracking-[-0.05em] md:text-7xl">
                See who bought, when they bought, and how much they committed.
              </h2>
            </div>

            <p className="max-w-sm text-sm leading-6 text-[var(--ink-muted)] md:col-span-4 md:justify-self-end">
              Each block is an actual reported purchase, not an abstract
              market indicator.
            </p>
          </div>

          <ActivityCalendar
            activity={data.activity}
            heartbeat={data.heartbeat}
            visibleDays={7}
            compact
          />
        </div>
      </section>
    </>
  );
}
