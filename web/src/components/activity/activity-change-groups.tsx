import Link from "next/link";
import type { ActivityFeedItem } from "@/types/activity";

const groups = [
  {
    key: "new_cluster",
    title: "New coordinated buying",
    description:
      "Companies where multiple executives are now acting independently in the same direction.",
  },
  {
    key: "silence_break",
    title: "Silence broken",
    description:
      "Executives returning after unusually long periods without open-market purchases.",
  },
  {
    key: "conviction_increase",
    title: "Conviction increased",
    description:
      "Companies where behavior change and evidence strength rose together.",
  },
] as const;

export function ActivityChangeGroups({
  items,
}: {
  items: ActivityFeedItem[];
}) {
  return (
    <div className="grid gap-8 lg:grid-cols-3">
      {groups.map((group) => {
        const matches = items
          .filter((item) =>
            item.changeTypes.includes(group.key),
          )
          .slice(0, 5);

        return (
          <section
            key={group.key}
            className="border-t border-[var(--line-strong)] pt-5"
          >
            <h3 className="font-display text-4xl leading-none">
              {group.title}
            </h3>

            <p className="mt-4 text-sm leading-6 text-[var(--ink-muted)]">
              {group.description}
            </p>

            <div className="mt-7 divide-y divide-[var(--line)]">
              {matches.length ? (
                matches.map((item) => (
                  <Link
                    key={`${group.key}-${item.id}`}
                    href={`/companies/${item.companySlug}`}
                    className="grid grid-cols-[auto_1fr_auto] gap-3 py-4"
                  >
                    <span className="font-display text-2xl">
                      {item.ticker}
                    </span>

                    <span className="text-sm text-[var(--ink-muted)]">
                      {item.summary}
                    </span>

                    <span className="font-mono text-xs">
                      {item.conviction}
                    </span>
                  </Link>
                ))
              ) : (
                <p className="py-5 text-sm text-[var(--ink-soft)]">
                  No current examples.
                </p>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
