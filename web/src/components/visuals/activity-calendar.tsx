"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import {
  formatCurrency,
  formatDate,
  formatScore,
  slugifyTicker,
} from "@/lib/format";
import { safeText } from "@/lib/visual";
import type {
  DailyActivityData,
  HeartbeatData,
} from "@/types/home";

interface CalendarEvent {
  id: string;
  date: string;
  ticker: string;
  companyName: string;
  insiderName: string;
  role: string;
  headline: string;
  purchaseValue: number;
  conviction: number;
  behaviorChange: number;
  buyerCount: number;
}

interface CalendarDay {
  date: string;
  purchaseValue: number;
  buyerCount: number;
  eventCount: number;
  medianConviction: number;
  events: CalendarEvent[];
}

function finite(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);

    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return fallback;
}

function normalizeDate(value: string): string {
  if (!value) return "";

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return value.slice(0, 10);
  }

  return parsed.toISOString().slice(0, 10);
}

function buildCalendarDays(
  activity: DailyActivityData,
  heartbeat: HeartbeatData,
): CalendarDay[] {
  const eventsByDate = new Map<string, CalendarEvent[]>();

  heartbeat.beats.forEach((beat, index) => {
    const date = normalizeDate(safeText(beat.date));

    if (!date) return;

    const ticker = safeText(beat.ticker, "—");

    const event: CalendarEvent = {
      id:
        safeText(beat.event_id) ||
        `${date}-${ticker}-${index}`,
      date,
      ticker,
      companyName: safeText(
        beat.company_name,
        "Company unavailable",
      ),
      insiderName: safeText(
        beat.insider_name,
        "Executive",
      ),
      role: safeText(
        (beat as Record<string, unknown>).role,
        safeText(
          (beat as Record<string, unknown>).normalized_roles,
          "Role unavailable",
        ),
      ),
      headline: safeText(
        beat.headline,
        `${safeText(beat.insider_name, "An executive")} disclosed a purchase.`,
      ),
      purchaseValue: Math.max(
        0,
        finite(beat.purchase_value),
      ),
      conviction: Math.max(
        0,
        Math.min(
          100,
          finite(
            (beat as Record<string, unknown>).conviction_score,
            finite(beat.intensity) * 100,
          ),
        ),
      ),
      behaviorChange: Math.max(
        0,
        Math.min(
          100,
          finite(
            (beat as Record<string, unknown>).behavior_change_score,
          ),
        ),
      ),
      buyerCount: Math.max(
        1,
        Math.round(
          finite(
            (beat as Record<string, unknown>).buyer_count,
            1,
          ),
        ),
      ),
    };

    const existing = eventsByDate.get(date) ?? [];
    existing.push(event);
    eventsByDate.set(date, existing);
  });

  return activity.days
    .map((day) => {
      const date = normalizeDate(day.date);
      const events = (eventsByDate.get(date) ?? []).sort(
        (left, right) =>
          right.conviction - left.conviction ||
          right.purchaseValue - left.purchaseValue,
      );

      return {
        date,
        purchaseValue: day.purchase_value ?? 0,
        buyerCount: day.buyer_count,
        eventCount: day.event_count,
        medianConviction: day.median_conviction ?? 0,
        events,
      };
    })
    .filter((day) => day.date)
    .sort((left, right) =>
      left.date.localeCompare(right.date),
    );
}

export function ActivityCalendar({
  activity,
  heartbeat,
  visibleDays = 20,
  compact = false,
}: {
  activity: DailyActivityData;
  heartbeat: HeartbeatData;
  visibleDays?: number;
  compact?: boolean;
}) {
  const days = useMemo(
    () => buildCalendarDays(activity, heartbeat),
    [activity, heartbeat],
  );

  const windowSize = Math.max(
    5,
    Math.min(visibleDays, days.length || visibleDays),
  );

  const [endIndex, setEndIndex] = useState(days.length);
  const [selectedDate, setSelectedDate] = useState(
    days[days.length - 1]?.date ?? "",
  );

  const startIndex = Math.max(0, endIndex - windowSize);
  const visible = days.slice(startIndex, endIndex);

  const selected =
    days.find((day) => day.date === selectedDate) ??
    visible[visible.length - 1];

  const canGoEarlier = startIndex > 0;
  const canGoLater = endIndex < days.length;

  function goEarlier() {
    if (!canGoEarlier) return;

    const nextEnd = Math.max(
      windowSize,
      endIndex - Math.max(5, Math.floor(windowSize / 2)),
    );

    setEndIndex(nextEnd);

    const nextVisible = days.slice(
      Math.max(0, nextEnd - windowSize),
      nextEnd,
    );

    if (
      selected &&
      !nextVisible.some(
        (day) => day.date === selected.date,
      )
    ) {
      setSelectedDate(
        nextVisible[nextVisible.length - 1]?.date ?? "",
      );
    }
  }

  function goLater() {
    if (!canGoLater) return;

    const nextEnd = Math.min(
      days.length,
      endIndex + Math.max(5, Math.floor(windowSize / 2)),
    );

    setEndIndex(nextEnd);

    const nextVisible = days.slice(
      Math.max(0, nextEnd - windowSize),
      nextEnd,
    );

    if (
      selected &&
      !nextVisible.some(
        (day) => day.date === selected.date,
      )
    ) {
      setSelectedDate(
        nextVisible[nextVisible.length - 1]?.date ?? "",
      );
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={goEarlier}
          disabled={!canGoEarlier}
          className="inline-flex items-center gap-2 text-sm disabled:cursor-not-allowed disabled:opacity-30"
        >
          <ChevronLeft className="size-4" />
          Earlier
        </button>

        <p className="font-mono text-xs uppercase tracking-[0.12em] text-[var(--ink-soft)]">
          {compact
            ? `${visible.length} recent days`
            : `${visible.length} trading days`}
        </p>

        <button
          type="button"
          onClick={goLater}
          disabled={!canGoLater}
          className="inline-flex items-center gap-2 text-sm disabled:cursor-not-allowed disabled:opacity-30"
        >
          Later
          <ChevronRight className="size-4" />
        </button>
      </div>

      <div className="overflow-x-auto pb-4">
        <div
          className="grid min-w-max gap-2"
          style={{
            gridTemplateColumns: `repeat(${visible.length}, minmax(${
              compact ? "7.25rem" : "8.75rem"
            }, 1fr))`,
          }}
        >
          {visible.map((day) => {
            const active =
              selected?.date === day.date;

            const cluster =
              day.buyerCount >= 3 ||
              day.events.some(
                (event) => event.buyerCount >= 3,
              );

            return (
              <button
                key={day.date}
                type="button"
                onClick={() =>
                  setSelectedDate(day.date)
                }
                className={`flex min-h-[22rem] flex-col border p-3 text-left transition-[transform,border-color,background-color] duration-300 ${
                  active
                    ? "border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_7%,var(--canvas))]"
                    : cluster
                      ? "border-[var(--line-strong)] bg-[color-mix(in_srgb,var(--ink)_4%,var(--surface))]"
                      : "border-[var(--line)] bg-[var(--surface)]"
                } hover:-translate-y-0.5 hover:border-[var(--line-strong)]`}
                aria-pressed={active}
              >
                <div className="border-b border-[var(--line)] pb-3">
                  <time className="font-mono text-[0.6875rem] uppercase tracking-[0.12em] text-[var(--ink-soft)]">
                    {formatDate(day.date, {
                      month: "short",
                      day: "numeric",
                    })}
                  </time>

                  {cluster ? (
                    <p className="mt-2 text-[0.625rem] uppercase tracking-[0.12em] text-[var(--accent-ink)]">
                      Cluster day
                    </p>
                  ) : null}
                </div>

                <div className="mt-3 flex-1 space-y-2">
                  {day.events.length ? (
                    day.events
                      .slice(0, compact ? 3 : 4)
                      .map((event) => (
                        <EventBlock
                          key={event.id}
                          event={event}
                          active={active}
                        />
                      ))
                  ) : (
                    <div className="grid min-h-28 place-items-center border border-dashed border-[var(--line)] text-center">
                      <span className="text-xs text-[var(--ink-soft)]">
                        No qualifying event
                      </span>
                    </div>
                  )}

                  {day.events.length >
                  (compact ? 3 : 4) ? (
                    <p className="pt-1 text-xs text-[var(--ink-muted)]">
                      +
                      {day.events.length -
                        (compact ? 3 : 4)}{" "}
                      more
                    </p>
                  ) : null}
                </div>

                <div className="mt-4 border-t border-[var(--line)] pt-3">
                  <p className="font-mono text-sm">
                    {formatCurrency(day.purchaseValue)}
                  </p>
                  <p className="mt-1 text-xs text-[var(--ink-muted)]">
                    {day.buyerCount} buyer
                    {day.buyerCount === 1 ? "" : "s"}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {selected ? (
        <SelectedDay day={selected} />
      ) : null}
    </div>
  );
}

function EventBlock({
  event,
  active,
}: {
  event: CalendarEvent;
  active: boolean;
}) {
  const behaviorWidth = Math.max(
    5,
    Math.min(100, event.behaviorChange),
  );

  return (
    <div
      className={`relative overflow-hidden border-l-4 px-3 py-3 ${
        active
          ? "border-l-[var(--accent)] bg-[var(--canvas)]"
          : "border-l-[var(--ink)] bg-[var(--canvas)]"
      }`}
    >
      <span
        className="absolute inset-x-0 top-0 h-0.5 bg-[var(--accent)]"
        style={{
          width: `${behaviorWidth}%`,
        }}
        aria-hidden="true"
      />

      <div className="flex items-start justify-between gap-2">
        <p className="font-display text-2xl leading-none">
          {event.ticker}
        </p>

        <span className="font-mono text-[0.6875rem]">
          {formatScore(event.conviction)}
        </span>
      </div>

      <p className="mt-2 truncate text-xs text-[var(--ink-muted)]">
        {event.role}
      </p>

      <p className="mt-2 font-mono text-sm">
        {formatCurrency(event.purchaseValue)}
      </p>
    </div>
  );
}


function SelectedDay({
  day,
}: {
  day: CalendarDay;
}) {
  const uniqueCompanies = Array.from(
    day.events.reduce((companies, event) => {
      const key = event.ticker.toUpperCase();
      const existing = companies.get(key);

      if (!existing) {
        companies.set(key, {
          ...event,
        });
        return companies;
      }

      companies.set(key, {
        ...existing,
        purchaseValue: Math.max(
          existing.purchaseValue,
          event.purchaseValue,
        ),
        conviction: Math.max(
          existing.conviction,
          event.conviction,
        ),
        behaviorChange: Math.max(
          existing.behaviorChange,
          event.behaviorChange,
        ),
        buyerCount: Math.max(
          existing.buyerCount,
          event.buyerCount,
        ),
        headline:
          existing.headline !==
          "An executive disclosed a purchase."
            ? existing.headline
            : event.headline,
      });

      return companies;
    }, new Map<string, CalendarEvent>())
    .values(),
  ).sort(
    (left, right) =>
      right.conviction - left.conviction ||
      right.purchaseValue - left.purchaseValue ||
      left.ticker.localeCompare(right.ticker),
  );

  if (!uniqueCompanies.length) {
    return null;
  }

  const leading = uniqueCompanies[0];

  return (
    <section className="mt-8 border-t border-[var(--line-strong)] pt-6">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div>
          <p className="eyebrow">
            {formatDate(day.date)}
          </p>

          <h3 className="mt-4 max-w-[18ch] font-display text-3xl leading-[0.98] tracking-[-0.035em] md:text-4xl">
            {uniqueCompanies.length === 1
              ? `${leading.ticker} was the only company with qualifying activity.`
              : `${uniqueCompanies.length} unique companies recorded qualifying activity.`}
          </h3>
        </div>

        <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm lg:text-right">
          <div>
            <p className="font-mono text-lg">
              {formatCurrency(day.purchaseValue)}
            </p>
            <p className="text-[var(--ink-muted)]">
              reported buying
            </p>
          </div>

          <div>
            <p className="font-mono text-lg">
              {day.buyerCount}
            </p>
            <p className="text-[var(--ink-muted)]">
              buyer{day.buyerCount === 1 ? "" : "s"}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {uniqueCompanies.slice(0, 8).map((event) => (
          <Link
            key={`selected-${event.ticker}`}
            href={`/companies/${slugifyTicker(
              event.ticker,
            )}`}
            className="inline-flex items-center gap-3 border border-[var(--line)] bg-[var(--surface)] px-3 py-2 transition-colors hover:border-[var(--line-strong)]"
          >
            <span className="font-display text-xl leading-none">
              {event.ticker}
            </span>

            <span className="font-mono text-xs text-[var(--ink-muted)]">
              {formatCurrency(event.purchaseValue)}
            </span>
          </Link>
        ))}

        {uniqueCompanies.length > 8 ? (
          <span className="inline-flex items-center border border-dashed border-[var(--line)] px-3 py-2 text-xs text-[var(--ink-muted)]">
            +{uniqueCompanies.length - 8} more
          </span>
        ) : null}
      </div>
    </section>
  );
}
