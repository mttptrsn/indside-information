"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useMemo, useState } from "react";
import { formatCurrency, formatDate } from "@/lib/format";
import type {
  CompanyStoryData,
  CompanyStoryPurchaseMarker,
} from "@/types/interior";

interface Point {
  date: string;
  timestamp: number;
  price: number;
  x: number;
  y: number;
}

function numberOrNull(value: unknown): number | null {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function scale(
  value: number,
  minimum: number,
  maximum: number,
  outputMinimum: number,
  outputMaximum: number,
): number {
  if (maximum === minimum) {
    return (outputMinimum + outputMaximum) / 2;
  }

  return (
    outputMinimum +
    ((value - minimum) / (maximum - minimum)) *
      (outputMaximum - outputMinimum)
  );
}

function signedPercent(
  value: number | null | undefined,
): string {
  if (
    value === null ||
    value === undefined ||
    !Number.isFinite(value)
  ) {
    return "Unavailable";
  }

  return `${value > 0 ? "+" : ""}${value.toFixed(1)}%`;
}

function linePath(points: Point[]): string {
  return points
    .map(
      (point, index) =>
        `${index === 0 ? "M" : "L"} ${point.x.toFixed(
          2,
        )} ${point.y.toFixed(2)}`,
    )
    .join(" ");
}

function nearestPoint(
  points: Point[],
  date: string,
): Point | null {
  const timestamp = new Date(date).getTime();

  if (!Number.isFinite(timestamp) || !points.length) {
    return null;
  }

  return points.reduce(
    (nearest, point) =>
      Math.abs(point.timestamp - timestamp) <
      Math.abs(nearest.timestamp - timestamp)
        ? point
        : nearest,
    points[0],
  );
}

export function CompanyPriceStory({
  story,
}: {
  story: CompanyStoryData;
}) {
  const reducedMotion = useReducedMotion();
  const [selectedMarker, setSelectedMarker] =
    useState<CompanyStoryPurchaseMarker | null>(null);

  const width = 1120;
  const height = 520;
  const left = 74;
  const right = 38;
  const top = 54;
  const bottom = 76;

  const points = useMemo<Point[]>(() => {
    const raw = story.price_path
      .map((item) => {
        const price = numberOrNull(
          item.adjusted_close ?? item.close,
        );
        const timestamp = new Date(item.date).getTime();

        if (
          price === null ||
          !Number.isFinite(timestamp)
        ) {
          return null;
        }

        return {
          date: item.date,
          timestamp,
          price,
        };
      })
      .filter(
        (
          item,
        ): item is {
          date: string;
          timestamp: number;
          price: number;
        } => item !== null,
      );

    if (!raw.length) {
      return [];
    }

    const prices = raw.map((item) => item.price);
    const minimumPrice = Math.min(...prices);
    const maximumPrice = Math.max(...prices);
    const minimumDate = raw[0].timestamp;
    const maximumDate = raw[raw.length - 1].timestamp;

    return raw.map((item) => ({
      ...item,
      x: scale(
        item.timestamp,
        minimumDate,
        maximumDate,
        left,
        width - right,
      ),
      y: scale(
        item.price,
        minimumPrice,
        maximumPrice,
        height - bottom,
        top,
      ),
    }));
  }, [story.price_path]);

  const markers = useMemo(
    () =>
      story.purchase_markers
        .map((marker) => {
          const point = nearestPoint(
            points,
            marker.price_date ??
              marker.transaction_date,
          );

          return point
            ? {
                marker,
                point,
              }
            : null;
        })
        .filter(
          (
            item,
          ): item is {
            marker: CompanyStoryPurchaseMarker;
            point: Point;
          } => item !== null,
        ),
    [points, story.purchase_markers],
  );

  if (!story.price_available || !points.length) {
    return (
      <div className="border-y border-[var(--line)] py-14">
        <h3 className="max-w-[15ch] font-display text-4xl leading-[0.96] tracking-[-0.04em]">
          Price history is unavailable for this company.
        </h3>

        <p className="mt-5 max-w-xl text-sm leading-6 text-[var(--ink-muted)]">
          The filing and behavioral evidence remains available, but this
          profile does not have a usable yfinance price history.
        </p>
      </div>
    );
  }

  const prices = points.map((point) => point.price);
  const minimumPrice = Math.min(...prices);
  const maximumPrice = Math.max(...prices);
  const averagePurchasePrice = numberOrNull(
    story.summary.average_reported_purchase_price,
  );

  const averagePurchaseY =
    averagePurchasePrice === null
      ? null
      : scale(
          averagePurchasePrice,
          minimumPrice,
          maximumPrice,
          height - bottom,
          top,
        );

  const selected =
    selectedMarker ??
    story.purchase_markers[
      story.purchase_markers.length - 1
    ] ??
    null;

  return (
    <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_19rem]">
      <div className="overflow-x-auto border-y border-[var(--line)]">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="block min-w-[58rem] w-full"
          role="img"
          aria-labelledby="price-story-title price-story-description"
        >
          <title id="price-story-title">
            Price history with executive purchase markers
          </title>

          <desc id="price-story-description">
            The line shows adjusted closing prices. Circles show disclosed
            executive purchases. The dashed line shows the weighted
            average reported purchase price.
          </desc>

          <defs>
            <linearGradient
              id="price-story-area"
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop
                offset="0%"
                stopColor="var(--accent)"
                stopOpacity="0.18"
              />
              <stop
                offset="100%"
                stopColor="var(--accent)"
                stopOpacity="0"
              />
            </linearGradient>
          </defs>

          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
            const price =
              minimumPrice +
              (maximumPrice - minimumPrice) * ratio;
            const y = scale(
              price,
              minimumPrice,
              maximumPrice,
              height - bottom,
              top,
            );

            return (
              <g key={ratio}>
                <line
                  x1={left}
                  x2={width - right}
                  y1={y}
                  y2={y}
                  stroke="var(--line)"
                />

                <text
                  x={left - 12}
                  y={y + 4}
                  textAnchor="end"
                  className="fill-[var(--ink-soft)] text-[12px]"
                >
                  {formatCurrency(price)}
                </text>
              </g>
            );
          })}

          {averagePurchaseY !== null ? (
            <g>
              <line
                x1={left}
                x2={width - right}
                y1={averagePurchaseY}
                y2={averagePurchaseY}
                stroke="var(--accent)"
                strokeWidth="2"
                strokeDasharray="7 7"
              />

              <text
                x={width - right}
                y={averagePurchaseY - 10}
                textAnchor="end"
                className="fill-[var(--accent-ink)] text-[12px] font-medium"
              >
                Executive cost basis{" "}
                {formatCurrency(averagePurchasePrice)}
              </text>
            </g>
          ) : null}

          <motion.path
            d={`${linePath(points)} L ${
              points[points.length - 1].x
            } ${height - bottom} L ${points[0].x} ${
              height - bottom
            } Z`}
            fill="url(#price-story-area)"
            initial={
              reducedMotion
                ? false
                : {
                    opacity: 0,
                  }
            }
            animate={{
              opacity: 1,
            }}
            transition={{
              duration: 0.8,
            }}
          />

          <motion.path
            d={linePath(points)}
            fill="none"
            stroke="var(--ink)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={
              reducedMotion
                ? false
                : {
                    pathLength: 0,
                  }
            }
            animate={{
              pathLength: 1,
            }}
            transition={{
              duration: 1.1,
              ease: [0.16, 1, 0.3, 1],
            }}
          />

          {markers.map(({ marker, point }, index) => {
            const active =
              selected?.event_id === marker.event_id;
            const purchaseValue =
              numberOrNull(marker.purchase_value) ?? 0;
            const radius = Math.max(
              7,
              Math.min(
                18,
                7 +
                  Math.log10(
                    Math.max(purchaseValue, 1),
                  ),
              ),
            );

            return (
              <motion.g
                key={
                  marker.event_id ??
                  `${marker.transaction_date}-${index}`
                }
                initial={
                  reducedMotion
                    ? false
                    : {
                        opacity: 0,
                        scale: 0.55,
                      }
                }
                animate={{
                  opacity: 1,
                  scale: active ? 1.18 : 1,
                }}
                transition={{
                  duration: 0.4,
                  delay: reducedMotion
                    ? 0
                    : index * 0.03,
                }}
                style={{
                  transformOrigin: `${point.x}px ${point.y}px`,
                }}
                role="button"
                tabIndex={0}
                className="cursor-pointer"
                onMouseEnter={() =>
                  setSelectedMarker(marker)
                }
                onFocus={() =>
                  setSelectedMarker(marker)
                }
                onClick={() =>
                  setSelectedMarker(marker)
                }
                onKeyDown={(event) => {
                  if (
                    event.key === "Enter" ||
                    event.key === " "
                  ) {
                    event.preventDefault();
                    setSelectedMarker(marker);
                  }
                }}
                aria-label={`${marker.owner_name ?? "Executive"} purchased ${formatCurrency(
                  purchaseValue,
                )} on ${formatDate(
                  marker.transaction_date,
                )}`}
              >
                <line
                  x1={point.x}
                  x2={point.x}
                  y1={point.y}
                  y2={height - bottom}
                  stroke={
                    active
                      ? "var(--accent)"
                      : "var(--line-strong)"
                  }
                  strokeDasharray="3 5"
                />

                <circle
                  cx={point.x}
                  cy={point.y}
                  r={radius + 5}
                  fill="var(--canvas)"
                  stroke={
                    active
                      ? "var(--accent)"
                      : "var(--ink)"
                  }
                  strokeWidth={active ? 3 : 1.5}
                />

                <circle
                  cx={point.x}
                  cy={point.y}
                  r={radius}
                  fill={
                    active
                      ? "var(--accent)"
                      : "var(--ink)"
                  }
                />
              </motion.g>
            );
          })}

          <text
            x={left}
            y={height - 28}
            className="fill-[var(--ink-muted)] text-[12px]"
          >
            {formatDate(points[0].date, {
              month: "short",
              year: "numeric",
            })}
          </text>

          <text
            x={width - right}
            y={height - 28}
            textAnchor="end"
            className="fill-[var(--ink-muted)] text-[12px]"
          >
            {formatDate(
              points[points.length - 1].date,
              {
                month: "short",
                year: "numeric",
              },
            )}
          </text>
        </svg>
      </div>

      <aside className="border-t border-[var(--line-strong)] pt-5">
        <p className="eyebrow">Price context</p>

        <p className="mt-5 font-display text-4xl leading-none">
          {formatCurrency(story.summary.current_price)}
        </p>

        <p className="mt-2 text-sm text-[var(--ink-muted)]">
          Latest adjusted close
        </p>

        <dl className="mt-8 divide-y divide-[var(--line)] border-y border-[var(--line)]">
          <Fact
            label="Versus executive cost basis"
            value={signedPercent(
              story.summary
                .percent_vs_average_purchase_price,
            )}
          />

          <Fact
            label="Since latest purchase"
            value={signedPercent(
              story.summary.return_since_latest_purchase,
            )}
          />

          <Fact
            label="From 52-week high"
            value={signedPercent(
              story.summary.drawdown_from_52_week_high,
            )}
          />

          <Fact
            label="63-session move"
            value={signedPercent(
              story.summary.return_63_sessions,
            )}
          />
        </dl>

        {selected ? (
          <div className="mt-8">
            <p className="text-xs uppercase tracking-[0.12em] text-[var(--ink-soft)]">
              Selected purchase
            </p>

            <p className="mt-4 font-display text-3xl leading-none">
              {selected.owner_name ?? "Executive"}
            </p>

            <p className="mt-3 text-sm text-[var(--ink-muted)]">
              {formatDate(selected.transaction_date)}
            </p>

            <p className="mt-5 font-mono text-lg">
              {formatCurrency(selected.purchase_value)}
            </p>

            {selected.headline ? (
              <p className="mt-4 text-sm leading-6">
                {selected.headline}
              </p>
            ) : null}
          </div>
        ) : null}
      </aside>
    </div>
  );
}

function Fact({
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

      <dd className="font-mono text-sm">{value}</dd>
    </div>
  );
}
