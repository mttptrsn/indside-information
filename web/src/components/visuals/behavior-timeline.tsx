"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useMemo, useState } from "react";
import {
  formatCurrency,
  formatDate,
} from "@/lib/format";
import {
  finite,
  safeText,
  scale,
} from "@/lib/visual";

interface PurchaseEvent {
  id: string;
  date: string;
  timestamp: number;
  owner: string;
  role: string;
  value: number;
  conviction: number;
  ownership: number;
}

interface DailyBar {
  id: string;
  date: string;
  timestamp: number;
  value: number;
  conviction: number;
  buyerCount: number;
  owners: string[];
  roles: string[];
  ownership: number;
  eventCount: number;
}

interface DateTick {
  timestamp: number;
  month: string;
  year: string;
  showYear: boolean;
}

const DAY = 86_400_000;

function parseTimestamp(value: string): number {
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function monthStart(timestamp: number): Date {
  const date = new Date(timestamp);

  return new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      1,
    ),
  );
}

function addMonths(date: Date, count: number): Date {
  return new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth() + count,
      1,
    ),
  );
}

function dateTicks(
  minimum: number,
  maximum: number,
): DateTick[] {
  const spanDays = Math.max(
    1,
    (maximum - minimum) / DAY,
  );

  const step =
    spanDays > 3650
      ? 12
      : spanDays > 1825
        ? 6
        : spanDays > 900
          ? 3
          : spanDays > 360
            ? 2
            : 1;

  const ticks: DateTick[] = [];
  let current = monthStart(minimum);
  let previousYear = "";

  while (current.getTime() <= maximum) {
    const year = String(
      current.getUTCFullYear(),
    );

    ticks.push({
      timestamp: current.getTime(),
      month: current.toLocaleDateString(
        "en-US",
        {
          month: "short",
          timeZone: "UTC",
        },
      ),
      year,
      showYear: year !== previousYear,
    });

    previousYear = year;
    current = addMonths(current, step);
  }

  return ticks;
}

function valueGrid(maximum: number): number[] {
  if (maximum <= 0) return [0];

  return Array.from(
    { length: 5 },
    (_, index) =>
      (maximum / 4) * index,
  );
}

function normalizeEvents(
  events: Array<Record<string, unknown>>,
): PurchaseEvent[] {
  return events
    .map((event, index) => {
      const date = safeText(
        event.transaction_date,
        safeText(event.as_of_date),
      );

      return {
        id:
          safeText(event.event_id) ||
          safeText(event.transaction_id) ||
          `${date || "event"}-${index}`,
        date,
        timestamp: parseTimestamp(date),
        owner: safeText(
          event.owner_name,
          "Executive",
        ),
        role: safeText(
          event.normalized_roles,
          safeText(
            event.raw_officer_title,
            "Role unavailable",
          ),
        ),
        value: Math.max(
          0,
          finite(
            event.purchase_value ??
              event.current_purchase_value ??
              event.total_reported_purchase_value ??
              event.reported_value,
          ),
        ),
        conviction: Math.max(
          0,
          Math.min(
            100,
            finite(event.conviction_score),
          ),
        ),
        ownership: Math.max(
          0,
          finite(
            event.ownership_increase_percent,
          ),
        ),
      };
    })
    .filter(
      (event) =>
        event.date &&
        event.timestamp > 0,
    )
    .sort(
      (left, right) =>
        left.timestamp - right.timestamp,
    );
}

function groupDailyBars(
  events: PurchaseEvent[],
): DailyBar[] {
  const groups = new Map<
    string,
    PurchaseEvent[]
  >();

  for (const event of events) {
    const date = new Date(
      event.timestamp,
    )
      .toISOString()
      .slice(0, 10);

    const current = groups.get(date) ?? [];
    current.push(event);
    groups.set(date, current);
  }

  return [...groups.entries()]
    .map(([date, dailyEvents]) => {
      const owners = [
        ...new Set(
          dailyEvents.map(
            (event) => event.owner,
          ),
        ),
      ];

      const roles = [
        ...new Set(
          dailyEvents
            .map((event) => event.role)
            .filter(Boolean),
        ),
      ];

      return {
        id: date,
        date,
        timestamp: parseTimestamp(date),
        value: dailyEvents.reduce(
          (sum, event) =>
            sum + event.value,
          0,
        ),
        conviction:
          dailyEvents.reduce(
            (sum, event) =>
              sum + event.conviction,
            0,
          ) /
          Math.max(
            dailyEvents.length,
            1,
          ),
        buyerCount: owners.length,
        owners,
        roles,
        ownership: Math.max(
          ...dailyEvents.map(
            (event) =>
              event.ownership,
          ),
          0,
        ),
        eventCount:
          dailyEvents.length,
      };
    })
    .sort(
      (left, right) =>
        left.timestamp - right.timestamp,
    );
}

export function BehaviorTimeline({
  events,
}: {
  events: Array<Record<string, unknown>>;
}) {
  const reducedMotion = useReducedMotion();
  const [selectedId, setSelectedId] =
    useState("");

  const width = 1120;
  const height = 480;
  const leftPadding = 108;
  const rightPadding = 38;
  const topPadding = 46;
  const bottomPadding = 104;
  const plotBottom =
    height - bottomPadding;
  const plotHeight =
    plotBottom - topPadding;

  const normalized = useMemo(
    () => normalizeEvents(events),
    [events],
  );

  const bars = useMemo(
    () => groupDailyBars(normalized),
    [normalized],
  );

  if (!bars.length) {
    return (
      <div className="border-y border-[var(--line)] py-16 text-center">
        <p className="font-display text-3xl">
          No purchase history is available.
        </p>
      </div>
    );
  }

  const minimumDate = Math.min(
    ...bars.map(
      (bar) => bar.timestamp,
    ),
  );

  const maximumDate = Math.max(
    ...bars.map(
      (bar) => bar.timestamp,
    ),
    minimumDate + DAY,
  );

  const maximumValue = Math.max(
    ...bars.map((bar) => bar.value),
    1,
  );

  const ticks = dateTicks(
    minimumDate,
    maximumDate,
  );

  const grid = valueGrid(maximumValue);

  const availableWidth =
    width -
    leftPadding -
    rightPadding;

  const naturalBarWidth =
    availableWidth /
    Math.max(bars.length, 1);

  const barWidth = Math.max(
    12,
    Math.min(
      42,
      naturalBarWidth * 0.56,
    ),
  );

  const selected =
    bars.find(
      (bar) => bar.id === selectedId,
    ) ??
    bars[bars.length - 1];

  return (
    <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_18rem]">
      <div className="overflow-x-auto border-y border-[var(--line)]">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="block min-w-[58rem] w-full"
          role="img"
          aria-labelledby="behavior-bars-title behavior-bars-description"
        >
          <title id="behavior-bars-title">
            Executive purchases over time
          </title>

          <desc id="behavior-bars-description">
            Each bar represents the total
            reported purchase value on one date.
            Dates run from left to right and
            purchase values run from bottom to
            top. Multiple same-day events are
            combined into one bar.
          </desc>

          <rect
            x={leftPadding}
            y={topPadding}
            width={availableWidth}
            height={plotHeight}
            fill="var(--surface)"
          />

          {grid.map((value) => {
            const y = scale(
              value,
              0,
              maximumValue,
              plotBottom,
              topPadding,
            );

            return (
              <g key={value}>
                <line
                  x1={leftPadding}
                  x2={
                    width -
                    rightPadding
                  }
                  y1={y}
                  y2={y}
                  stroke="var(--line)"
                  strokeWidth="1"
                />

                <text
                  x={leftPadding - 14}
                  y={y + 4}
                  textAnchor="end"
                  className="fill-[var(--ink-soft)] text-[12px]"
                >
                  {formatCurrency(value)}
                </text>
              </g>
            );
          })}

          {ticks.map((tick) => {
            const x = scale(
              tick.timestamp,
              minimumDate,
              maximumDate,
              leftPadding,
              width - rightPadding,
            );

            return (
              <g key={tick.timestamp}>
                <line
                  x1={x}
                  x2={x}
                  y1={topPadding}
                  y2={plotBottom}
                  stroke="var(--line)"
                  strokeWidth="1"
                  strokeDasharray="2 5"
                />

                <text
                  x={x}
                  y={plotBottom + 30}
                  textAnchor="middle"
                  className="fill-[var(--ink-muted)] text-[12px]"
                >
                  {tick.month}
                </text>

                {tick.showYear ? (
                  <text
                    x={x}
                    y={plotBottom + 53}
                    textAnchor="middle"
                    className="fill-[var(--ink)] text-[13px] font-medium"
                  >
                    {tick.year}
                  </text>
                ) : null}
              </g>
            );
          })}

          <line
            x1={leftPadding}
            x2={
              width -
              rightPadding
            }
            y1={plotBottom}
            y2={plotBottom}
            stroke="var(--line-strong)"
            strokeWidth="1.5"
          />

          <text
            x={leftPadding}
            y={24}
            className="fill-[var(--ink-muted)] text-[13px]"
          >
            Reported purchase value by transaction date
          </text>

          {bars.map(
            (bar, index) => {
              const x = scale(
                bar.timestamp,
                minimumDate,
                maximumDate,
                leftPadding,
                width - rightPadding,
              );

              const y = scale(
                bar.value,
                0,
                maximumValue,
                plotBottom,
                topPadding,
              );

              const barHeight =
                plotBottom - y;

              const selectedBar =
                selected.id === bar.id;

              return (
                <motion.g
                  key={bar.id}
                  initial={
                    reducedMotion
                      ? false
                      : {
                          opacity: 0,
                          scaleY: 0,
                        }
                  }
                  animate={{
                    opacity: 1,
                    scaleY: 1,
                  }}
                  transition={{
                    duration: 0.5,
                    delay:
                      reducedMotion
                        ? 0
                        : Math.min(
                            index,
                            24,
                          ) * 0.025,
                    ease: [
                      0.16,
                      1,
                      0.3,
                      1,
                    ],
                  }}
                  style={{
                    transformOrigin: `${x}px ${plotBottom}px`,
                  }}
                  role="button"
                  tabIndex={0}
                  className="cursor-pointer"
                  onMouseEnter={() =>
                    setSelectedId(
                      bar.id,
                    )
                  }
                  onFocus={() =>
                    setSelectedId(
                      bar.id,
                    )
                  }
                  onClick={() =>
                    setSelectedId(
                      bar.id,
                    )
                  }
                  onKeyDown={(
                    keyboardEvent,
                  ) => {
                    if (
                      keyboardEvent.key ===
                        "Enter" ||
                      keyboardEvent.key ===
                        " "
                    ) {
                      keyboardEvent.preventDefault();
                      setSelectedId(
                        bar.id,
                      );
                    }
                  }}
                  aria-label={`${formatDate(
                    bar.date,
                  )}, ${formatCurrency(
                    bar.value,
                  )}, ${bar.buyerCount} buyer${
                    bar.buyerCount === 1
                      ? ""
                      : "s"
                  }`}
                >
                  <rect
                    x={
                      x -
                      barWidth / 2
                    }
                    y={y}
                    width={barWidth}
                    height={Math.max(
                      4,
                      barHeight,
                    )}
                    rx="3"
                    fill={
                      selectedBar
                        ? "var(--accent)"
                        : "var(--ink)"
                    }
                    opacity={
                      selectedBar
                        ? 1
                        : 0.72
                    }
                  />

                  <rect
                    x={
                      x -
                      barWidth / 2 -
                      3
                    }
                    y={y - 3}
                    width={
                      barWidth + 6
                    }
                    height={
                      Math.max(
                        10,
                        barHeight + 6,
                      )
                    }
                    rx="5"
                    fill="none"
                    stroke={
                      selectedBar
                        ? "var(--accent)"
                        : "transparent"
                    }
                    strokeWidth="2"
                  />

                  {bar.buyerCount >
                  1 ? (
                    <g>
                      <circle
                        cx={x}
                        cy={y - 14}
                        r="11"
                        fill={
                          selectedBar
                            ? "var(--accent)"
                            : "var(--canvas)"
                        }
                        stroke={
                          selectedBar
                            ? "var(--accent)"
                            : "var(--line-strong)"
                        }
                      />

                      <text
                        x={x}
                        y={y - 10}
                        textAnchor="middle"
                        className={
                          selectedBar
                            ? "fill-[var(--accent-text)] text-[10px] font-medium"
                            : "fill-[var(--ink)] text-[10px] font-medium"
                        }
                      >
                        {bar.buyerCount}
                      </text>
                    </g>
                  ) : null}

                  {selectedBar ? (
                    <text
                      x={x}
                      y={
                        plotBottom +
                        76
                      }
                      textAnchor="middle"
                      className="fill-[var(--ink)] text-[12px] font-medium"
                    >
                      {formatDate(
                        bar.date,
                        {
                          month:
                            "short",
                          day:
                            "numeric",
                          year:
                            "numeric",
                        },
                      )}
                    </text>
                  ) : null}
                </motion.g>
              );
            },
          )}
        </svg>
      </div>

      <aside className="border-t border-[var(--line-strong)] pt-5">
        <p className="eyebrow">
          {formatDate(selected.date)}
        </p>

        <p className="mt-5 font-display text-4xl leading-none">
          {formatCurrency(
            selected.value,
          )}
        </p>

        <p className="mt-3 text-sm text-[var(--ink-muted)]">
          Total reported buying on
          this date
        </p>

        <dl className="mt-8 divide-y divide-[var(--line)] border-y border-[var(--line)]">
          <Detail
            label="Independent buyers"
            value={String(
              selected.buyerCount,
            )}
          />

          <Detail
            label="Purchase events"
            value={String(
              selected.eventCount,
            )}
          />

          <Detail
            label="Average conviction"
            value={String(
              Math.round(
                selected.conviction,
              ),
            )}
          />

          {selected.ownership > 0 ? (
            <Detail
              label="Largest ownership increase"
              value={`${selected.ownership.toFixed(
                1,
              )}%`}
            />
          ) : null}
        </dl>

        <div className="mt-7">
          <p className="text-xs uppercase tracking-[0.12em] text-[var(--ink-soft)]">
            Buyers
          </p>

          <p className="mt-3 text-sm leading-6">
            {selected.owners.join(
              ", ",
            )}
          </p>
        </div>

        <div className="mt-8 border-t border-[var(--line)] pt-5">
          <p className="text-xs uppercase tracking-[0.12em] text-[var(--ink-soft)]">
            How to read this
          </p>

          <p className="mt-3 text-sm leading-6 text-[var(--ink-muted)]">
            Bar height shows dollars
            purchased. Position shows the
            exact transaction date. A number
            above a bar means multiple
            executives bought that day.
          </p>
        </div>
      </aside>
    </div>
  );
}

function Detail({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="grid grid-cols-[1fr_auto] gap-4 py-4">
      <dt className="text-sm text-[var(--ink-muted)]">
        {label}
      </dt>

      <dd className="font-mono text-sm">
        {value}
      </dd>
    </div>
  );
}
