"use client";

import {
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation";
import {
  useEffect,
  useState,
} from "react";
import { ActivityChangeGroups } from "@/components/activity/activity-change-groups";
import { ActivityFeed } from "@/components/activity/activity-feed";
import { ActivityPeriodSelector } from "@/components/activity/activity-period-selector";
import { ActivitySummary } from "@/components/activity/activity-summary";
import { SectorAcceleration } from "@/components/activity/sector-acceleration";
import {
  buildActivityFeed,
  filterWindow,
  sectorAcceleration,
  summarizePeriod,
} from "@/lib/activity";
import type {
  ActivityChangeType,
  ActivitySourceEvent,
  ActivityWindow,
} from "@/types/activity";

export function ActivityWorkspace({
  items,
  sectors,
}: {
  items: ActivitySourceEvent[];
  sectors: string[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [window, setWindow] = useState<ActivityWindow>(
    (searchParams.get("window") as ActivityWindow) ??
      "7d",
  );
  const [sector, setSector] = useState(
    searchParams.get("sector") ?? "all",
  );
  const [changeType, setChangeType] =
    useState<ActivityChangeType>(
      (searchParams.get(
        "type",
      ) as ActivityChangeType) ?? "all",
    );
  const [minimumValue, setMinimumValue] = useState(
    Number(searchParams.get("minValue") ?? 0),
  );
  const [minimumBuyers, setMinimumBuyers] = useState(
    Number(searchParams.get("minBuyers") ?? 1),
  );

  const ranges = filterWindow(items, window);

  const currentSummary = summarizePeriod(
    ranges.current,
    ranges.start,
    ranges.end,
  );

  const duration = ranges.end - ranges.start;
  const previousEnd =
    ranges.start - 86_400_000;
  const previousStart =
    previousEnd - duration;

  const previousSummary = summarizePeriod(
    ranges.previous,
    previousStart,
    previousEnd,
  );

  const feed = buildActivityFeed(
    ranges.current,
  ).filter(
    (item) =>
      (sector === "all" ||
        item.sector === sector) &&
      (changeType === "all" ||
        item.changeTypes.includes(changeType)) &&
      item.purchaseValue >= minimumValue &&
      item.buyerCount >= minimumBuyers,
  );

  const acceleration = sectorAcceleration(
    ranges.current,
    ranges.previous,
  );

  useEffect(() => {
    const params = new URLSearchParams();

    if (window !== "7d") {
      params.set("window", window);
    }

    if (sector !== "all") {
      params.set("sector", sector);
    }

    if (changeType !== "all") {
      params.set("type", changeType);
    }

    if (minimumValue > 0) {
      params.set(
        "minValue",
        String(minimumValue),
      );
    }

    if (minimumBuyers > 1) {
      params.set(
        "minBuyers",
        String(minimumBuyers),
      );
    }

    const query = params.toString();

    router.replace(
      query ? `${pathname}?${query}` : pathname,
      { scroll: false },
    );
  }, [
    window,
    sector,
    changeType,
    minimumValue,
    minimumBuyers,
    pathname,
    router,
  ]);

  return (
    <div>
      <div className="sticky top-16 z-20 border-y border-[var(--line)] bg-[color-mix(in_srgb,var(--canvas)_94%,transparent)] backdrop-blur-xl">
        <div className="editorial-container flex flex-col gap-4 py-4 lg:flex-row lg:items-center lg:justify-between">
          <ActivityPeriodSelector
            value={window}
            onChange={setWindow}
          />

          <div className="flex flex-wrap gap-3">
            <select
              value={sector}
              onChange={(event) =>
                setSector(event.target.value)
              }
              className="border border-[var(--line)] bg-transparent px-3 py-2 text-sm"
            >
              <option value="all">
                Every sector
              </option>

              {sectors.map((option) => (
                <option
                  key={option}
                  value={option}
                >
                  {option}
                </option>
              ))}
            </select>

            <select
              value={changeType}
              onChange={(event) =>
                setChangeType(
                  event.target
                    .value as ActivityChangeType,
                )
              }
              className="border border-[var(--line)] bg-transparent px-3 py-2 text-sm"
            >
              <option value="all">
                Every change
              </option>
              <option value="new_cluster">
                New clusters
              </option>
              <option value="silence_break">
                Silence breaks
              </option>
              <option value="conviction_increase">
                Conviction increased
              </option>
              <option value="large_purchase">
                Large purchases
              </option>
            </select>

            <select
              value={minimumBuyers}
              onChange={(event) =>
                setMinimumBuyers(
                  Number(event.target.value),
                )
              }
              className="border border-[var(--line)] bg-transparent px-3 py-2 text-sm"
            >
              <option value={1}>
                Any buyer count
              </option>
              <option value={2}>
                2+ buyers
              </option>
              <option value={3}>
                3+ buyers
              </option>
              <option value={5}>
                5+ buyers
              </option>
            </select>

            <select
              value={minimumValue}
              onChange={(event) =>
                setMinimumValue(
                  Number(event.target.value),
                )
              }
              className="border border-[var(--line)] bg-transparent px-3 py-2 text-sm"
            >
              <option value={0}>
                Any purchase size
              </option>
              <option value={100000}>
                $100K+
              </option>
              <option value={500000}>
                $500K+
              </option>
              <option value={1000000}>
                $1M+
              </option>
            </select>
          </div>
        </div>
      </div>

      <div className="editorial-container py-10">
        <ActivitySummary
          current={currentSummary}
          previous={previousSummary}
        />

        <section className="section-space">
          <p className="eyebrow">
            What changed
          </p>

          <h2 className="mt-5 mb-10 max-w-[12ch] font-display text-5xl leading-[0.94] tracking-[-0.05em] md:text-7xl">
            The filings that changed the story.
          </h2>

          <ActivityFeed items={feed} />
        </section>

        <section className="section-space border-t border-[var(--line)] pt-12">
          <p className="eyebrow">
            New developments
          </p>

          <div className="mt-8">
            <ActivityChangeGroups items={feed} />
          </div>
        </section>

        <section className="section-space border-t border-[var(--line)] pt-12">
          <p className="eyebrow">
            Sector acceleration
          </p>

          <h2 className="mt-5 mb-10 max-w-[13ch] font-display text-5xl leading-[0.94] tracking-[-0.05em] md:text-7xl">
            Where insider activity is speeding up.
          </h2>

          <SectorAcceleration
            items={acceleration}
          />
        </section>
      </div>
    </div>
  );
}
