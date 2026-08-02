"use client";

import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useMemo, useState } from "react";
import {
  formatCurrency,
  formatScore,
  slugifyTicker,
} from "@/lib/format";
import { clamp, finite, safeText, scale } from "@/lib/visual";
import type { DiscoveryItem } from "@/types/home";

interface CompanySignal {
  id: string;
  ticker: string;
  companyName: string;
  headline: string;
  sector: string;
  purchaseValue: number;
  conviction: number;
  behaviorChange: number;
  buyerCount: number;
  clusterScore: number;
}

interface PositionedSignal extends CompanySignal {
  x: number;
  y: number;
  coreRadius: number;
  outerRadius: number;
  ringGap: number;
}

interface SignalLayout {
  width: number;
  baselineY: number;
  signals: PositionedSignal[];
}

function prepareCompanies(items: DiscoveryItem[]): CompanySignal[] {
  const byCompany = new Map<string, CompanySignal>();

  items.forEach((item, index) => {
    const ticker = safeText(item.ticker, "—");
    const companyName = safeText(
      item.company_name,
      "Company unavailable",
    );

    if (ticker === "—") return;

    const id =
      [
        safeText(item.issuer_cik),
        ticker.toUpperCase(),
        companyName.toLowerCase(),
      ]
        .filter(Boolean)
        .join("|") || `${ticker}-${index}`;

    const candidate: CompanySignal = {
      id,
      ticker,
      companyName,
      headline: safeText(
        item.headline,
        "Executive buying deserves attention.",
      ),
      sector: safeText(item.sector, "Unclassified"),
      purchaseValue: Math.max(0, finite(item.purchase_value)),
      conviction: clamp(finite(item.conviction_score), 0, 100),
      behaviorChange: clamp(
        finite(item.behavior_change_score),
        0,
        100,
      ),
      buyerCount: Math.max(
        1,
        Math.round(finite(item.buyer_count, 1)),
      ),
      clusterScore: clamp(finite(item.cluster_score), 0, 100),
    };

    const existing = byCompany.get(id);

    if (!existing) {
      byCompany.set(id, candidate);
      return;
    }

    const candidateStrength =
      candidate.conviction * 3 +
      candidate.buyerCount * 22 +
      candidate.clusterScore +
      Math.log10(Math.max(candidate.purchaseValue, 1)) * 5;

    const existingStrength =
      existing.conviction * 3 +
      existing.buyerCount * 22 +
      existing.clusterScore +
      Math.log10(Math.max(existing.purchaseValue, 1)) * 5;

    byCompany.set(id, {
      ...existing,
      headline:
        candidateStrength > existingStrength
          ? candidate.headline
          : existing.headline,
      sector:
        existing.sector !== "Unclassified"
          ? existing.sector
          : candidate.sector,
      purchaseValue: Math.max(
        existing.purchaseValue,
        candidate.purchaseValue,
      ),
      conviction: Math.max(
        existing.conviction,
        candidate.conviction,
      ),
      behaviorChange: Math.max(
        existing.behaviorChange,
        candidate.behaviorChange,
      ),
      buyerCount: Math.max(
        existing.buyerCount,
        candidate.buyerCount,
      ),
      clusterScore: Math.max(
        existing.clusterScore,
        candidate.clusterScore,
      ),
    });
  });

  return [...byCompany.values()]
    .sort(
      (left, right) =>
        left.conviction - right.conviction ||
        left.purchaseValue - right.purchaseValue ||
        left.ticker.localeCompare(right.ticker),
    )
    .slice(-10);
}

function layoutSignals(
  companies: CompanySignal[],
  height: number,
): SignalLayout {
  const baselineY = height * 0.5;

  if (!companies.length) {
    return {
      width: 1160,
      baselineY,
      signals: [],
    };
  }

  const maximumPurchase = Math.max(
    ...companies.map((company) => company.purchaseValue),
    1,
  );

  const preferredRingGap = 7;
  const maximumOuterRadius = 112;
  const minimumCoreRadius = 34;
  const maximumCoreRadius = 58;
  const nodeGap = 52;
  const leftPadding = 92;
  const rightPadding = 92;

  const sized = companies.map((company) => {
    const coreRadius = scale(
      Math.sqrt(company.purchaseValue),
      0,
      Math.sqrt(maximumPurchase),
      minimumCoreRadius,
      maximumCoreRadius,
    );

    const additionalRings = Math.max(0, company.buyerCount - 1);
    const ringGap =
      additionalRings === 0
        ? preferredRingGap
        : Math.min(
            preferredRingGap,
            Math.max(3.5, (maximumOuterRadius - coreRadius) / additionalRings),
          );

    const outerRadius =
      coreRadius + additionalRings * ringGap;

    return {
      ...company,
      coreRadius,
      outerRadius,
      ringGap,
    };
  });

  let cursor = leftPadding;

  const signals: PositionedSignal[] = sized.map((company, index) => {
    if (index === 0) {
      cursor += company.outerRadius;
    } else {
      const previous = sized[index - 1];
      cursor +=
        previous.outerRadius +
        nodeGap +
        company.outerRadius;
    }

    return {
      ...company,
      x: cursor,
      y: baselineY,
    };
  });

  const last = signals[signals.length - 1];
  const width = Math.max(
    1160,
    last.x + last.outerRadius + rightPadding,
  );

  return {
    width,
    baselineY,
    signals,
  };
}

export function ExecutiveConsensusMap({
  items,
  height = 610,
}: {
  items: DiscoveryItem[];
  height?: number;
}) {
  const reducedMotion = useReducedMotion();
  const [selectedId, setSelectedId] = useState("");
  const companies = useMemo(
    () => prepareCompanies(items),
    [items],
  );

  const layout = useMemo(
    () => layoutSignals(companies, height),
    [companies, height],
  );

  const signals = layout.signals;
  const width = layout.width;

  const selected =
    signals.find((signal) => signal.id === selectedId) ??
    signals[signals.length - 1];

  const totalBuyers = signals.reduce(
    (sum, signal) => sum + signal.buyerCount,
    0,
  );

  const companiesWithMultipleBuyers = signals.filter(
    (signal) => signal.buyerCount >= 2,
  ).length;

  const companiesWithThreeOrMore = signals.filter(
    (signal) => signal.buyerCount >= 3,
  ).length;

  const totalPurchased = signals.reduce(
    (sum, signal) => sum + signal.purchaseValue,
    0,
  );

  const baselineY = layout.baselineY;

  return (
    <div>
      <div className="mb-8 grid gap-5 border-y border-[var(--line)] py-5 sm:grid-cols-2 xl:grid-cols-4">
        <Summary
          value={String(totalBuyers)}
          label="executive buyers represented"
        />
        <Summary
          value={String(companiesWithMultipleBuyers)}
          label="companies with multiple buyers"
        />
        <Summary
          value={String(companiesWithThreeOrMore)}
          label="companies with three or more buyers"
        />
        <Summary
          value={formatCurrency(totalPurchased)}
          label="total reported buying"
        />
      </div>

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="overflow-x-auto border border-[var(--line)] bg-[var(--surface)]">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="block h-auto w-full"
            style={{ minWidth: `${Math.max(width, 1160)}px` }}
            role="img"
            aria-labelledby="consensus-line-title consensus-line-description"
          >
            <title id="consensus-line-title">
              Executive conviction line
            </title>
            <desc id="consensus-line-description">
              Companies are ordered from lower conviction on the left to
              higher conviction on the right. Circle size represents total
              reported purchase value. Each concentric ring represents one
              executive buyer.
            </desc>

            <defs>
              <linearGradient
                id="conviction-line-gradient"
                x1="0%"
                y1="0%"
                x2="100%"
                y2="0%"
              >
                <stop
                  offset="0%"
                  stopColor="var(--line-strong)"
                />
                <stop
                  offset="100%"
                  stopColor="var(--accent)"
                />
              </linearGradient>

              <filter
                id="conviction-node-shadow"
                x="-40%"
                y="-40%"
                width="180%"
                height="180%"
              >
                <feDropShadow
                  dx="0"
                  dy="10"
                  stdDeviation="13"
                  floodColor="var(--ink)"
                  floodOpacity="0.09"
                />
              </filter>
            </defs>

            <text
              x="40"
              y="42"
              className="fill-[var(--ink-soft)] text-[16px]"
            >
              Lowest conviction
            </text>

            <text
              x={width - 40}
              y="42"
              textAnchor="end"
              className="fill-[var(--ink-soft)] text-[16px]"
            >
              Highest conviction →
            </text>

            <line
              x1="40"
              x2={width - 40}
              y1={baselineY}
              y2={baselineY}
              stroke="url(#conviction-line-gradient)"
              strokeWidth="2"
              opacity="0.72"
            />

            {signals.map((signal, index) => {
              const selectedSignal = selected?.id === signal.id;

              return (
                <motion.g
                  key={signal.id}
                  role="button"
                  tabIndex={0}
                  className="cursor-pointer"
                  initial={
                    reducedMotion
                      ? false
                      : {
                          opacity: 0,
                          scale: 0.78,
                          y: 12,
                        }
                  }
                  animate={{
                    opacity: 1,
                    scale: selectedSignal ? 1.055 : 1,
                    y: 0,
                  }}
                  transition={{
                    duration: 0.48,
                    delay: reducedMotion ? 0 : index * 0.045,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                  style={{
                    transformOrigin: `${signal.x}px ${signal.y}px`,
                  }}
                  onMouseEnter={() => setSelectedId(signal.id)}
                  onFocus={() => setSelectedId(signal.id)}
                  onClick={() => setSelectedId(signal.id)}
                  onKeyDown={(event) => {
                    if (
                      event.key === "Enter" ||
                      event.key === " "
                    ) {
                      event.preventDefault();
                      setSelectedId(signal.id);
                    }
                  }}
                  aria-label={`${signal.ticker}, ${
                    signal.buyerCount
                  } executive buyers, conviction ${Math.round(
                    signal.conviction,
                  )}, ${formatCurrency(
                    signal.purchaseValue,
                  )} purchased`}
                >
                  <line
                    x1={signal.x}
                    x2={signal.x}
                    y1={baselineY - signal.outerRadius - 18}
                    y2={baselineY + signal.outerRadius + 28}
                    stroke={
                      selectedSignal
                        ? "var(--accent)"
                        : "var(--line)"
                    }
                    strokeWidth="1"
                    opacity={selectedSignal ? 0.65 : 0.35}
                  />

                  {Array.from({
                    length: signal.buyerCount,
                  }).map((_, ringIndex) => {
                    const radius =
                      signal.coreRadius + ringIndex * signal.ringGap;

                    return (
                      <circle
                        key={`${signal.id}-ring-${ringIndex}`}
                        cx={signal.x}
                        cy={signal.y}
                        r={radius}
                        fill={
                          ringIndex === 0
                            ? selectedSignal
                              ? "color-mix(in srgb, var(--accent) 22%, var(--canvas))"
                              : "var(--canvas)"
                            : "none"
                        }
                        stroke={
                          selectedSignal
                            ? "var(--accent)"
                            : ringIndex === 0
                              ? "var(--ink)"
                              : "var(--line-strong)"
                        }
                        strokeWidth={
                          selectedSignal
                            ? ringIndex === 0
                              ? 3
                              : 2.4
                            : ringIndex === 0
                              ? 1.8
                              : 1.5
                        }
                        opacity={
                          ringIndex === 0
                            ? 1
                            : 0.55 + ringIndex * 0.055
                        }
                        filter={
                          ringIndex === 0
                            ? "url(#conviction-node-shadow)"
                            : undefined
                        }
                      />
                    );
                  })}

                  <text
                    x={signal.x}
                    y={signal.y - 5}
                    textAnchor="middle"
                    className={
                      selectedSignal
                        ? "fill-[var(--accent-ink)] text-[20px] font-semibold"
                        : "fill-[var(--ink)] text-[20px] font-semibold"
                    }
                  >
                    {signal.ticker}
                  </text>

                  <text
                    x={signal.x}
                    y={signal.y + 17}
                    textAnchor="middle"
                    className="fill-[var(--ink-muted)] text-[11px]"
                  >
                    {formatCurrency(signal.purchaseValue)}
                  </text>

                  <text
                    x={signal.x}
                    y={baselineY + signal.outerRadius + 54}
                    textAnchor="middle"
                    className={
                      selectedSignal
                        ? "fill-[var(--accent-ink)] text-[19px] font-semibold"
                        : "fill-[var(--ink)] text-[17px] font-medium"
                    }
                  >
                    {signal.buyerCount}
                  </text>

                  <text
                    x={signal.x}
                    y={baselineY + signal.outerRadius + 75}
                    textAnchor="middle"
                    className="fill-[var(--ink-muted)] text-[12px]"
                  >
                    buyer{signal.buyerCount === 1 ? "" : "s"}
                  </text>

                  <text
                    x={signal.x}
                    y={baselineY + signal.outerRadius + 102}
                    textAnchor="middle"
                    className="fill-[var(--ink-soft)] text-[11px]"
                  >
                    conviction {Math.round(signal.conviction)}
                  </text>
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
                initial={{
                  opacity: 0,
                  y: 12,
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                }}
                exit={{
                  opacity: 0,
                  y: -8,
                }}
                transition={{ duration: 0.3 }}
                className="border-t border-[var(--line-strong)] pt-5"
              >
                <p className="eyebrow">
                  {selected.ticker} · {selected.sector}
                </p>

                <h3 className="mt-5 font-display text-4xl leading-[0.96] tracking-[-0.04em]">
                  {selected.buyerCount >= 2
                    ? `${selected.buyerCount} executives bought shares in the same company.`
                    : "One executive currently represents the buying signal."}
                </h3>

                <p className="mt-5 text-sm leading-6 text-[var(--ink-muted)]">
                  {selected.headline}
                </p>

                <dl className="mt-8 divide-y divide-[var(--line)] border-y border-[var(--line)]">
                  <Fact
                    label="Executive buyers"
                    value={String(selected.buyerCount)}
                  />
                  <Fact
                    label="Capital committed"
                    value={formatCurrency(
                      selected.purchaseValue,
                    )}
                  />
                  <Fact
                    label="Conviction"
                    value={formatScore(
                      selected.conviction,
                    )}
                  />
                  <Fact
                    label="Behavior change"
                    value={formatScore(
                      selected.behaviorChange,
                    )}
                  />
                </dl>

                <Link
                  href={`/companies/${slugifyTicker(
                    selected.ticker,
                  )}`}
                  className="mt-7 inline-flex border-b border-[var(--ink)] pb-1 text-sm"
                >
                  Open the evidence
                </Link>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </aside>
      </div>

      <div className="mt-8 grid gap-5 border border-[var(--line)] p-6 md:grid-cols-3">
        <Guide
          title="Rings show buyers"
          description="Each concentric ring represents one executive buyer."
        />
        <Guide
          title="Size shows dollars"
          description="Larger circles represent more reported purchase value."
        />
        <Guide
          title="Position shows conviction"
          description="Move right to see stronger executive conviction."
        />
      </div>
    </div>
  );
}

function Summary({
  value,
  label,
}: {
  value: string;
  label: string;
}) {
  return (
    <div>
      <p className="font-display text-4xl leading-none">
        {value}
      </p>
      <p className="mt-2 text-sm text-[var(--ink-muted)]">
        {label}
      </p>
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
      <dd className="font-mono text-sm">
        {value}
      </dd>
    </div>
  );
}

function Guide({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="border-t border-[var(--line-strong)] pt-4">
      <p className="font-display text-2xl leading-none">
        {title}
      </p>
      <p className="mt-3 text-sm leading-6 text-[var(--ink-muted)]">
        {description}
      </p>
    </div>
  );
}
