"use client";

import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useMemo, useState } from "react";
import {
  formatCurrency,
  formatMultiple,
  formatScore,
  slugifyTicker,
} from "@/lib/format";
import { clamp, finite, safeText, scale } from "@/lib/visual";
import type { DiscoveryItem } from "@/types/home";

interface TokenPoint {
  id: string;
  ticker: string;
  companyName: string;
  headline: string;
  sector: string;
  marketCap: number;
  conviction: number;
  behavior: number;
  purchase: number;
  buyers: number;
  multiple: number;
  targetX: number;
  targetY: number;
  x: number;
  y: number;
  width: number;
  height: number;
  xMetric: string;
}

interface PreparedPoint {
  id: string;
  ticker: string;
  companyName: string;
  headline: string;
  sector: string;
  marketCap: number;
  conviction: number;
  behavior: number;
  purchase: number;
  buyers: number;
  multiple: number;
}

function percentileRanks(values: number[], descending = false): number[] {
  if (!values.length) return [];

  const indexed = values.map((value, index) => ({ value, index }));

  indexed.sort((left, right) => {
    const difference = descending
      ? right.value - left.value
      : left.value - right.value;

    return difference || left.index - right.index;
  });

  const ranks = new Array<number>(values.length);
  let cursor = 0;

  while (cursor < indexed.length) {
    let end = cursor + 1;

    while (
      end < indexed.length &&
      indexed[end].value === indexed[cursor].value
    ) {
      end += 1;
    }

    const averagePosition = (cursor + end - 1) / 2;
    const percentile =
      indexed.length === 1
        ? 0.5
        : averagePosition / (indexed.length - 1);

    for (let position = cursor; position < end; position += 1) {
      ranks[indexed[position].index] = percentile;
    }

    cursor = end;
  }

  return ranks;
}

function usableVariation(values: number[]): boolean {
  const usable = values.filter(
    (value) => Number.isFinite(value) && value > 0,
  );

  if (usable.length < Math.max(5, values.length * 0.35)) {
    return false;
  }

  const unique = new Set(
    usable.map((value) => value.toPrecision(6)),
  );

  return unique.size >= Math.max(4, Math.ceil(values.length * 0.2));
}

function overlapAmount(
  left: TokenPoint,
  right: TokenPoint,
  gap: number,
): { x: number; y: number } | null {
  const horizontal =
    left.width / 2 + right.width / 2 + gap - Math.abs(right.x - left.x);

  const vertical =
    left.height / 2 + right.height / 2 + gap - Math.abs(right.y - left.y);

  if (horizontal <= 0 || vertical <= 0) {
    return null;
  }

  return { x: horizontal, y: vertical };
}

function packTokens(
  points: TokenPoint[],
  width: number,
  height: number,
  padding: number,
): TokenPoint[] {
  const packed = points.map((point) => ({ ...point }));
  const attraction = 0.045;
  const iterations = 260;
  const gap = 12;

  for (let iteration = 0; iteration < iterations; iteration += 1) {
    for (const point of packed) {
      point.x += (point.targetX - point.x) * attraction;
      point.y += (point.targetY - point.y) * attraction;
    }

    for (let first = 0; first < packed.length; first += 1) {
      for (let second = first + 1; second < packed.length; second += 1) {
        const left = packed[first];
        const right = packed[second];
        const overlap = overlapAmount(left, right, gap);

        if (!overlap) continue;

        const dx = right.x - left.x;
        const dy = right.y - left.y;

        if (overlap.x < overlap.y) {
          const direction = dx >= 0 ? 1 : -1;
          const push = overlap.x * 0.52;
          left.x -= push * direction;
          right.x += push * direction;
        } else {
          const direction = dy >= 0 ? 1 : -1;
          const push = overlap.y * 0.52;
          left.y -= push * direction;
          right.y += push * direction;
        }
      }
    }

    for (const point of packed) {
      point.x = clamp(
        point.x,
        padding + point.width / 2,
        width - padding - point.width / 2,
      );

      point.y = clamp(
        point.y,
        padding + point.height / 2,
        height - padding - point.height / 2,
      );
    }
  }

  return packed;
}

export function SignalLandscape({
  items,
  height = 620,
  compact = false,
}: {
  items: DiscoveryItem[];
  height?: number;
  compact?: boolean;
}) {
  const reducedMotion = useReducedMotion();
  const [selectedId, setSelectedId] = useState("");
  const width = 1000;
  const padding = compact ? 54 : 66;

  const points = useMemo<TokenPoint[]>(() => {
    const byCompany = new Map<string, PreparedPoint>();

    items.forEach((item, index) => {
      const ticker = safeText(item.ticker, "—");
      const companyName = safeText(
        item.company_name,
        "Company unavailable",
      );

      if (ticker === "—") return;

      const key = [
        safeText(item.issuer_cik),
        ticker.toUpperCase(),
        companyName.toLowerCase(),
      ]
        .filter(Boolean)
        .join("|");

      const candidate: PreparedPoint = {
        id: key || `${ticker}-${index}`,
        ticker,
        companyName,
        headline: safeText(
          item.headline,
          "An executive purchase deserves attention.",
        ),
        sector: safeText(item.sector, "Unclassified"),
        marketCap: Math.max(0, finite(item.market_cap)),
        conviction: clamp(finite(item.conviction_score), 0, 100),
        behavior: clamp(finite(item.behavior_change_score), 0, 100),
        purchase: Math.max(0, finite(item.purchase_value)),
        buyers: Math.max(
          1,
          Math.round(finite(item.buyer_count, 1)),
        ),
        multiple: Math.max(0, finite(item.purchase_multiple)),
      };

      const existing = byCompany.get(candidate.id);

      if (!existing) {
        byCompany.set(candidate.id, candidate);
        return;
      }

      const candidateStrength =
        candidate.conviction * 2 +
        candidate.behavior +
        Math.log10(Math.max(candidate.purchase, 1)) * 8;

      const existingStrength =
        existing.conviction * 2 +
        existing.behavior +
        Math.log10(Math.max(existing.purchase, 1)) * 8;

      byCompany.set(candidate.id, {
        ...existing,
        headline:
          candidateStrength > existingStrength
            ? candidate.headline
            : existing.headline,
        sector:
          existing.sector !== "Unclassified"
            ? existing.sector
            : candidate.sector,
        marketCap: Math.max(existing.marketCap, candidate.marketCap),
        conviction: Math.max(
          existing.conviction,
          candidate.conviction,
        ),
        behavior: Math.max(existing.behavior, candidate.behavior),
        purchase: Math.max(existing.purchase, candidate.purchase),
        buyers: Math.max(existing.buyers, candidate.buyers),
        multiple: Math.max(existing.multiple, candidate.multiple),
      });
    });

    const prepared = [...byCompany.values()]
      .sort(
        (left, right) =>
          right.conviction - left.conviction ||
          right.purchase - left.purchase ||
          left.ticker.localeCompare(right.ticker),
      )
      .slice(0, compact ? 14 : 24);

    if (!prepared.length) return [];

    const marketCaps = prepared.map((point) => point.marketCap);
    const behaviorValues = prepared.map((point) => point.behavior);
    const purchaseValues = prepared.map((point) => point.purchase);
    const convictionValues = prepared.map((point) => point.conviction);

    const useMarketCap = usableVariation(marketCaps);
    const useBehavior = usableVariation(behaviorValues);

    const xValues = useMarketCap
      ? marketCaps.map((value) => Math.log10(Math.max(value, 1)))
      : useBehavior
        ? behaviorValues
        : purchaseValues.map((value) => Math.log10(Math.max(value, 1)));

    const xRanks = percentileRanks(xValues);
    const yRanks = percentileRanks(convictionValues, true);

    const tokens: TokenPoint[] = prepared.map((point, index) => {
      const strength = point.conviction * 0.7 + point.behavior * 0.3;
      const widthValue = scale(strength, 0, 100, 104, compact ? 132 : 154);
      const heightValue = scale(strength, 0, 100, 66, compact ? 78 : 88);

      const targetX = scale(
        xRanks[index],
        0,
        1,
        padding + widthValue / 2,
        width - padding - widthValue / 2,
      );

      const targetY = scale(
        yRanks[index],
        0,
        1,
        padding + heightValue / 2,
        height - padding - heightValue / 2,
      );

      return {
        ...point,
        targetX,
        targetY,
        x: targetX,
        y: targetY,
        width: widthValue,
        height: heightValue,
        xMetric: useMarketCap
          ? "Company size"
          : useBehavior
            ? "Behavior change"
            : "Purchase size",
      };
    });

    return packTokens(tokens, width, height, padding);
  }, [items, height, compact, padding]);

  const selected =
    points.find((point) => point.id === selectedId) ?? points[0];

  const horizontalLabel =
    points[0]?.xMetric === "Company size"
      ? {
          left: "Smaller companies",
          right: "Larger companies",
        }
      : points[0]?.xMetric === "Behavior change"
        ? {
            left: "More typical behavior",
            right: "More unusual behavior",
          }
        : {
            left: "Smaller purchases",
            right: "Larger purchases",
          };

  return (
    <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="relative overflow-hidden border border-[var(--line)] bg-[var(--surface)]">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="block h-auto w-full"
          role="img"
          aria-labelledby="signal-landscape-title signal-landscape-description"
        >
          <title id="signal-landscape-title">
            Executive purchase signal landscape
          </title>
          <desc id="signal-landscape-description">
            Each company appears as a readable token. Stronger evidence appears
            higher. The horizontal axis uses company size when reliable,
            otherwise behavior change or purchase size.
          </desc>

          <defs>
            <pattern
              id="landscape-grid"
              width="100"
              height="100"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M 100 0 L 0 0 0 100"
                fill="none"
                stroke="var(--line)"
                strokeWidth="1"
              />
            </pattern>

            <filter id="token-shadow" x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow
                dx="0"
                dy="8"
                stdDeviation="10"
                floodColor="var(--ink)"
                floodOpacity="0.08"
              />
            </filter>
          </defs>

          <rect
            width={width}
            height={height}
            fill="url(#landscape-grid)"
            opacity="0.32"
          />

          <text
            x={padding}
            y={30}
            className="fill-[var(--ink-soft)] text-[16px]"
          >
            Stronger evidence
          </text>

          <text
            x={padding}
            y={height - 18}
            className="fill-[var(--ink-soft)] text-[16px]"
          >
            {horizontalLabel.left}
          </text>

          <text
            x={width - padding}
            y={height - 18}
            textAnchor="end"
            className="fill-[var(--ink-soft)] text-[16px]"
          >
            {horizontalLabel.right}
          </text>

          {points.map((point) => {
            const displacement = Math.hypot(
              point.x - point.targetX,
              point.y - point.targetY,
            );

            if (displacement < 6) return null;

            return (
              <line
                key={`tether-${point.id}`}
                x1={point.targetX}
                y1={point.targetY}
                x2={point.x}
                y2={point.y}
                stroke="var(--line-strong)"
                strokeWidth="1"
                strokeDasharray="3 5"
                opacity="0.34"
              />
            );
          })}

          {points.map((point, index) => {
            const selectedPoint = selected?.id === point.id;
            const x = point.x - point.width / 2;
            const y = point.y - point.height / 2;

            return (
              <motion.g
                key={point.id}
                initial={
                  reducedMotion
                    ? false
                    : {
                        opacity: 0,
                        scale: 0.94,
                        y: 10,
                      }
                }
                animate={{
                  opacity: 1,
                  scale: selectedPoint ? 1.035 : 1,
                  y: 0,
                }}
                transition={{
                  duration: 0.48,
                  delay: reducedMotion ? 0 : Math.min(index, 16) * 0.02,
                  ease: [0.16, 1, 0.3, 1],
                }}
                style={{
                  transformOrigin: `${point.x}px ${point.y}px`,
                }}
                onClick={() => setSelectedId(point.id)}
                onMouseEnter={() => setSelectedId(point.id)}
                role="button"
                tabIndex={0}
                className="cursor-pointer"
                aria-label={`${point.ticker}, conviction ${Math.round(
                  point.conviction,
                )}, purchase ${formatCurrency(point.purchase)}`}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setSelectedId(point.id);
                  }
                }}
              >
                <rect
                  x={x}
                  y={y}
                  width={point.width}
                  height={point.height}
                  rx="14"
                  fill={
                    selectedPoint
                      ? "var(--accent)"
                      : "var(--canvas)"
                  }
                  stroke={
                    selectedPoint
                      ? "var(--accent)"
                      : "var(--line-strong)"
                  }
                  strokeWidth={selectedPoint ? 2.5 : 1.25}
                  filter="url(#token-shadow)"
                />

                <rect
                  x={x}
                  y={y}
                  width={Math.max(
                    6,
                    point.width * (point.behavior / 100),
                  )}
                  height="4"
                  rx="2"
                  fill={
                    selectedPoint
                      ? "var(--accent-text)"
                      : "var(--accent)"
                  }
                />

                <text
                  x={x + 14}
                  y={y + 30}
                  className={
                    selectedPoint
                      ? "fill-[var(--accent-text)] text-[22px] font-semibold"
                      : "fill-[var(--ink)] text-[22px] font-semibold"
                  }
                >
                  {point.ticker}
                </text>

                <text
                  x={x + 14}
                  y={y + 50}
                  className={
                    selectedPoint
                      ? "fill-[color-mix(in_srgb,var(--accent-text)_72%,transparent)] text-[12px]"
                      : "fill-[var(--ink-muted)] text-[12px]"
                  }
                >
                  {formatCurrency(point.purchase)}
                </text>

                <text
                  x={x + point.width - 14}
                  y={y + point.height - 14}
                  textAnchor="end"
                  className={
                    selectedPoint
                      ? "fill-[var(--accent-text)] text-[13px] font-medium"
                      : "fill-[var(--ink)] text-[13px] font-medium"
                  }
                >
                  {formatScore(point.conviction)}
                </text>

                {point.buyers > 1 ? (
                  <g>
                    <circle
                      cx={x + point.width - 18}
                      cy={y + 18}
                      r="10"
                      fill={
                        selectedPoint
                          ? "var(--accent-text)"
                          : "var(--ink)"
                      }
                    />
                    <text
                      x={x + point.width - 18}
                      y={y + 22}
                      textAnchor="middle"
                      className={
                        selectedPoint
                          ? "fill-[var(--accent)] text-[10px] font-semibold"
                          : "fill-[var(--canvas)] text-[10px] font-semibold"
                      }
                    >
                      {point.buyers}
                    </text>
                  </g>
                ) : null}
              </motion.g>
            );
          })}
        </svg>
      </div>

      <aside className="xl:sticky xl:top-28 xl:self-start">
        <AnimatePresence mode="wait">
          {selected ? (
            <motion.div
              key={selected.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }}
              className="border-t border-[var(--line-strong)] pt-5"
            >
              <p className="eyebrow">
                {selected.ticker} · {selected.sector}
              </p>

              <h3 className="mt-5 font-display text-4xl leading-[0.96] tracking-[-0.04em]">
                {selected.headline}
              </h3>

              <dl className="mt-8 divide-y divide-[var(--line)] border-y border-[var(--line)]">
                <VisualFact
                  label="Capital committed"
                  value={formatCurrency(selected.purchase)}
                />
                <VisualFact
                  label="Evidence strength"
                  value={formatScore(selected.conviction)}
                />
                <VisualFact
                  label="Behavior change"
                  value={formatScore(selected.behavior)}
                />
                <VisualFact
                  label="Versus prior purchases"
                  value={formatMultiple(selected.multiple)}
                />
              </dl>

              <Link
                href={`/companies/${slugifyTicker(selected.ticker)}`}
                className="mt-7 inline-flex border-b border-[var(--ink)] pb-1 text-sm"
              >
                Open the evidence
              </Link>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </aside>
    </div>
  );
}

function VisualFact({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="grid grid-cols-[1fr_auto] gap-4 py-4">
      <dt className="text-sm text-[var(--ink-muted)]">{label}</dt>
      <dd className="font-mono text-sm">{value}</dd>
    </div>
  );
}
