import { ActivityFeedItem } from "@/components/activity/activity-feed-item";
import type { ActivityFeedItem as ActivityItem } from "@/types/activity";

export function ActivityFeed({
  items,
}: {
  items: ActivityItem[];
}) {
  const groups = new Map<string, ActivityItem[]>();

  for (const item of items) {
    const current = groups.get(item.filingDate) ?? [];
    current.push(item);
    groups.set(item.filingDate, current);
  }

  if (!items.length) {
    return (
      <div className="border-y border-[var(--line)] py-16 text-center">
        <p className="font-display text-4xl">
          No qualifying changes match this view.
        </p>
      </div>
    );
  }

  return (
    <div>
      {[...groups.entries()].map(([date, dateItems]) => (
        <section key={date} className="mb-12">
          <p className="eyebrow">{date}</p>

          <div className="mt-5">
            {dateItems.map((item) => (
              <ActivityFeedItem
                key={item.id}
                item={item}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
