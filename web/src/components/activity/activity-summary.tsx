import {
  changePercent,
  currency,
} from "@/lib/activity";
import type { ActivityPeriodSummary } from "@/types/activity";

export function ActivitySummary({
  current,
  previous,
}: {
  current: ActivityPeriodSummary;
  previous: ActivityPeriodSummary;
}) {
  const metrics = [
    {
      label: "Qualifying purchases",
      current: current.purchases,
      previous: previous.purchases,
      display: String(current.purchases),
    },
    {
      label: "Unique companies",
      current: current.companies,
      previous: previous.companies,
      display: String(current.companies),
    },
    {
      label: "Independent buyers",
      current: current.buyers,
      previous: previous.buyers,
      display: String(current.buyers),
    },
    {
      label: "Capital committed",
      current: current.purchaseValue,
      previous: previous.purchaseValue,
      display: currency(current.purchaseValue),
    },
    {
      label: "New buying clusters",
      current: current.newClusters,
      previous: previous.newClusters,
      display: String(current.newClusters),
    },
    {
      label: "Silence breaks",
      current: current.silenceBreaks,
      previous: previous.silenceBreaks,
      display: String(current.silenceBreaks),
    },
  ];

  return (
    <div className="grid border-y border-[var(--line)] sm:grid-cols-2 xl:grid-cols-3">
      {metrics.map((metric) => {
        const change = changePercent(
          metric.current,
          metric.previous,
        );

        return (
          <div
            key={metric.label}
            className="border-b border-r border-[var(--line)] p-5 last:border-r-0 sm:p-6"
          >
            <p className="text-sm text-[var(--ink-muted)]">
              {metric.label}
            </p>

            <p className="mt-4 font-display text-5xl leading-none">
              {metric.display}
            </p>

            <p className="mt-3 text-xs text-[var(--ink-soft)]">
              {change === null
                ? "New in this period"
                : `${change >= 0 ? "+" : ""}${change.toFixed(
                    0,
                  )}% versus prior period`}
            </p>
          </div>
        );
      })}
    </div>
  );
}
