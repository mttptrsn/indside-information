import type { Metadata } from "next";
import { ActivityWorkspace } from "@/components/activity/activity-workspace";
import { loadActivityPageData } from "@/lib/data/activity-page";

export const metadata: Metadata = {
  title: "Activity",
  description:
    "See what changed in executive buying, when it became public, and where activity is accelerating.",
};

export default async function ActivityPage() {
  const items = await loadActivityPageData();

  const sectors = [
    ...new Set(
      items
        .map((item) => item.sector)
        .filter(
          (value): value is string =>
            typeof value === "string" &&
            value.length > 0 &&
            value !== "Unclassified",
        ),
    ),
  ].sort();

  return (
    <main>
      <header className="editorial-container py-12 md:py-16">
        <p className="eyebrow">
          Activity intelligence
        </p>

        <h1 className="mt-5 max-w-[12ch] font-display text-6xl leading-[0.9] tracking-[-0.06em] md:text-8xl">
          What changed, and when did it become public?
        </h1>

        <p className="mt-6 max-w-2xl text-base leading-7 text-[var(--ink-muted)]">
          Follow new buying clusters, executives returning after long
          silence, material increases in conviction, and the sectors where
          insider activity is accelerating.
        </p>
      </header>

      <ActivityWorkspace
        items={items}
        sectors={sectors}
      />
    </main>
  );
}
