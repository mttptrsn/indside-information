import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { currency } from "@/lib/activity";
import type { ActivityFeedItem as ActivityItem } from "@/types/activity";

export function ActivityFeedItem({
  item,
}: {
  item: ActivityItem;
}) {
  return (
    <article className="grid gap-5 border-t border-[var(--line-strong)] py-6 md:grid-cols-[7rem_minmax(0,1fr)_auto]">
      <div>
        <p className="font-display text-3xl leading-none">
          {item.ticker}
        </p>

        <p className="mt-2 text-xs text-[var(--ink-muted)]">
          {item.sector}
        </p>
      </div>

      <div>
        <h3 className="font-display text-3xl leading-[0.98]">
          {item.summary}
        </h3>

        <p className="mt-4 max-w-2xl text-sm leading-6 text-[var(--ink-muted)]">
          {item.detail}
        </p>

        <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-xs text-[var(--ink-soft)]">
          <span>
            Purchased {item.transactionDate}
          </span>

          <span>
            Disclosed {item.filingDate}
          </span>

          {item.filingDelayDays !== null ? (
            <span>
              Filing delay {item.filingDelayDays} day
              {item.filingDelayDays === 1 ? "" : "s"}
            </span>
          ) : null}
        </div>
      </div>

      <div className="md:text-right">
        <p className="font-mono text-lg">
          {currency(item.purchaseValue)}
        </p>

        <p className="mt-1 text-xs text-[var(--ink-muted)]">
          {item.buyerCount} buyer
          {item.buyerCount === 1 ? "" : "s"}
        </p>

        <Link
          href={`/companies/${item.companySlug}`}
          className="mt-5 inline-flex items-center gap-2 border-b border-[var(--ink)] pb-1 text-sm"
        >
          Evidence
          <ArrowUpRight className="size-4" />
        </Link>
      </div>
    </article>
  );
}
