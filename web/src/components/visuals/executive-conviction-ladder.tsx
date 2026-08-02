"use client";

import Link from "next/link";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
} from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import {
  useMemo,
  useState,
} from "react";
import {
  formatCurrency,
  formatScore,
  slugifyTicker,
} from "@/lib/format";
import {
  clamp,
  finite,
  safeText,
} from "@/lib/visual";
import type { DiscoveryItem } from "@/types/home";

interface RankedCompany {
  id: string;
  ticker: string;
  companyName: string;
  headline: string;
  sector: string;
  industry: string;
  marketCap: number;
  conviction: number;
  behaviorChange: number;
  clusterScore: number;
  buyerCount: number;
  purchaseValue: number;
  rankScore: number;
  priceAvailable: boolean;
  currentPrice: number | null;
  percentVsCost: number | null;
  returnSinceLatest: number | null;
  drawdownFromHigh: number | null;
  priceTrend: string;
}

function firstText(
  values: unknown[],
  fallback: string,
): string {
  for (const value of values) {
    const result = safeText(value);

    if (
      result &&
      result.toLowerCase() !== "nan" &&
      result.toLowerCase() !== "none" &&
      result.toLowerCase() !== "null"
    ) {
      return result;
    }
  }

  return fallback;
}

function priceContext(
  company: RankedCompany,
): string {
  if (!company.priceAvailable) {
    return "";
  }

  if (company.percentVsCost !== null) {
    return `${Math.abs(company.percentVsCost).toFixed(1)}% ${
      company.percentVsCost >= 0 ? "above" : "below"
    } executive cost basis`;
  }

  if (company.returnSinceLatest !== null) {
    return `${company.returnSinceLatest >= 0 ? "+" : ""}${company.returnSinceLatest.toFixed(
      1,
    )}% since latest purchase`;
  }

  if (company.drawdownFromHigh !== null) {
    return `${Math.abs(company.drawdownFromHigh).toFixed(
      1,
    )}% below 52-week high`;
  }

  return company.priceTrend
    ? company.priceTrend.replaceAll("_", " ")
    : "";
}

function prepareCompanies(
  items: DiscoveryItem[],
): RankedCompany[] {
  const byCompany = new Map<
    string,
    RankedCompany
  >();

  items.forEach((item, index) => {
    const record =
      item as DiscoveryItem &
        Record<string, unknown>;

    const ticker = firstText(
      [
        item.ticker,
        record.primary_ticker,
        record.yf_ticker,
        record.symbol,
      ],
      "—",
    ).toUpperCase();

    const companyName = firstText(
      [
        item.company_name,
        record.issuer_name,
        record.name,
        record.company,
        record.display_name,
      ],
      ticker !== "—"
        ? `${ticker} issuer`
        : "Company unavailable",
    );

    if (ticker === "—") {
      return;
    }

    const sector = firstText(
      [
        item.sector,
        record.company_sector,
        record.gics_sector,
      ],
      "",
    );

    const industry = firstText(
      [
        item.industry,
        record.company_industry,
        record.gics_industry,
      ],
      "",
    );

    const id =
      [
        safeText(item.issuer_cik),
        ticker,
        companyName.toLowerCase(),
      ]
        .filter(Boolean)
        .join("|") ||
      `${ticker}-${index}`;

    const conviction = clamp(
      finite(item.conviction_score),
      0,
      100,
    );

    const behaviorChange = clamp(
      finite(item.behavior_change_score),
      0,
      100,
    );

    const clusterScore = clamp(
      finite(item.cluster_score),
      0,
      100,
    );

    const buyerCount = Math.max(
      1,
      Math.round(
        finite(item.buyer_count, 1),
      ),
    );

    const purchaseValue = Math.max(
      0,
      finite(item.purchase_value),
    );

    const marketCap = Math.max(
      0,
      finite(item.market_cap),
    );

    const rankScore = clamp(
      conviction * 0.45 +
        behaviorChange * 0.18 +
        clusterScore * 0.22 +
        Math.min(
          buyerCount,
          6,
        ) *
          2.5 +
        Math.min(
          Math.log10(
            Math.max(
              purchaseValue,
              1,
            ),
          ) * 1.6,
          10,
        ),
      0,
      100,
    );

    const storySummary =
      item.story_summary &&
      typeof item.story_summary === "object"
        ? item.story_summary
        : {};

    const optionalNumber = (
      value: unknown,
    ): number | null => {
      const number = Number(value);
      return Number.isFinite(number)
        ? number
        : null;
    };

    const candidate: RankedCompany = {
      id,
      ticker,
      companyName,
      headline: firstText(
        [
          item.headline,
          record.summary,
          record.reason,
        ],
        "Executive buying deserves attention.",
      ),
      sector,
      industry,
      marketCap,
      conviction,
      behaviorChange,
      clusterScore,
      buyerCount,
      purchaseValue,
      rankScore,
      priceAvailable:
        item.price_available === true,
      currentPrice: optionalNumber(
        storySummary.current_price,
      ),
      percentVsCost: optionalNumber(
        storySummary.percent_vs_average_purchase_price,
      ),
      returnSinceLatest: optionalNumber(
        storySummary.return_since_latest_purchase,
      ),
      drawdownFromHigh: optionalNumber(
        storySummary.drawdown_from_52_week_high,
      ),
      priceTrend: safeText(
        storySummary.trend,
      ),
    };

    const existing =
      byCompany.get(id);

    if (!existing) {
      byCompany.set(
        id,
        candidate,
      );
      return;
    }

    byCompany.set(id, {
      ...existing,
      companyName:
        existing.companyName !==
        `${existing.ticker} issuer`
          ? existing.companyName
          : candidate.companyName,
      headline:
        candidate.rankScore >
        existing.rankScore
          ? candidate.headline
          : existing.headline,
      sector:
        existing.sector ||
        candidate.sector,
      industry:
        existing.industry ||
        candidate.industry,
      marketCap: Math.max(
        existing.marketCap,
        candidate.marketCap,
      ),
      conviction: Math.max(
        existing.conviction,
        candidate.conviction,
      ),
      behaviorChange: Math.max(
        existing.behaviorChange,
        candidate.behaviorChange,
      ),
      clusterScore: Math.max(
        existing.clusterScore,
        candidate.clusterScore,
      ),
      buyerCount: Math.max(
        existing.buyerCount,
        candidate.buyerCount,
      ),
      purchaseValue: Math.max(
        existing.purchaseValue,
        candidate.purchaseValue,
      ),
      rankScore: Math.max(
        existing.rankScore,
        candidate.rankScore,
      ),
      priceAvailable:
        existing.priceAvailable ||
        candidate.priceAvailable,
      currentPrice:
        existing.currentPrice ??
        candidate.currentPrice,
      percentVsCost:
        existing.percentVsCost ??
        candidate.percentVsCost,
      returnSinceLatest:
        existing.returnSinceLatest ??
        candidate.returnSinceLatest,
      drawdownFromHigh:
        existing.drawdownFromHigh ??
        candidate.drawdownFromHigh,
      priceTrend:
        existing.priceTrend ||
        candidate.priceTrend,
    });
  });

  return [
    ...byCompany.values(),
  ].sort(
    (left, right) =>
      right.rankScore -
        left.rankScore ||
      right.buyerCount -
        left.buyerCount ||
      right.purchaseValue -
        left.purchaseValue ||
      left.ticker.localeCompare(
        right.ticker,
      ),
  );
}

export function ExecutiveConvictionLadder({
  items,
  limit = 8,
  compact = false,
}: {
  items: DiscoveryItem[];
  limit?: number;
  compact?: boolean;
}) {
  const reducedMotion =
    useReducedMotion();

  const [
    selectedId,
    setSelectedId,
  ] = useState("");

  const companies = useMemo(
    () =>
      prepareCompanies(items).slice(
        0,
        limit,
      ),
    [items, limit],
  );

  const selected =
    companies.find(
      (company) =>
        company.id === selectedId,
    ) ?? companies[0];

  return (
    <div className="grid gap-10 xl:grid-cols-[minmax(0,1fr)_20rem]">
      <ol className="divide-y divide-[var(--line)] border-y border-[var(--line)]">
        {companies.map(
          (company, index) => {
            const selectedCompany =
              selected?.id ===
              company.id;

            const prominence =
              index === 0
                ? "py-8 md:py-10"
                : index < 3
                  ? "py-7"
                  : "py-5";

            const classification =
              [
                company.sector,
                company.industry,
              ]
                .filter(Boolean)
                .join(" · ");

            return (
              <motion.li
                key={company.id}
                initial={
                  reducedMotion
                    ? false
                    : {
                        opacity: 0,
                        y: 18,
                      }
                }
                animate={{
                  opacity: 1,
                  y: 0,
                }}
                transition={{
                  duration: 0.46,
                  delay:
                    reducedMotion
                      ? 0
                      : index *
                        0.04,
                  ease: [
                    0.16,
                    1,
                    0.3,
                    1,
                  ],
                }}
              >
                <div
                  onMouseEnter={() =>
                    setSelectedId(
                      company.id,
                    )
                  }
                  onFocusCapture={() =>
                    setSelectedId(
                      company.id,
                    )
                  }
                  className={`grid w-full gap-5 text-left transition-opacity md:grid-cols-[4rem_minmax(0,1fr)_auto] md:items-center ${prominence} ${
                    selectedCompany
                      ? "opacity-100"
                      : "opacity-72 hover:opacity-100"
                  }`}
                >
                  <span
                    className={`font-display leading-none ${
                      index === 0
                        ? "text-6xl"
                        : index < 3
                          ? "text-5xl"
                          : "text-4xl"
                    }`}
                  >
                    {String(
                      index + 1,
                    ).padStart(
                      2,
                      "0",
                    )}
                  </span>

                  <span className="min-w-0">
                    <span className="flex flex-wrap items-baseline gap-x-4 gap-y-2">
                      <Link
                        href={`/companies/${slugifyTicker(
                          company.ticker,
                        )}`}
                        className={`font-display leading-none tracking-[-0.04em] transition-opacity hover:opacity-60 ${
                          index === 0
                            ? "text-5xl md:text-6xl"
                            : index < 3
                              ? "text-4xl md:text-5xl"
                              : "text-3xl md:text-4xl"
                        }`}
                        aria-label={`Open ${company.companyName} company profile`}
                      >
                        {company.ticker}
                      </Link>

                      <span className="text-sm text-[var(--ink-muted)]">
                        {
                          company.companyName
                        }
                      </span>
                    </span>

                    {classification ? (
                      <span className="mt-2 block text-xs text-[var(--ink-soft)]">
                        {
                          classification
                        }
                      </span>
                    ) : null}

                    {priceContext(company) ? (
                      <span className="mt-2 block text-sm font-medium text-[var(--accent-ink)]">
                        {priceContext(company)}
                      </span>
                    ) : null}

                    <span className="mt-5 block h-3 overflow-hidden bg-[var(--line)]">
                      <span
                        className="block h-full bg-[var(--ink)] transition-[width] duration-700"
                        style={{
                          width: `${Math.max(
                            8,
                            company.rankScore,
                          )}%`,
                        }}
                      />
                    </span>

                    <span className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm">
                      <span>
                        <strong className="font-medium">
                          {
                            company.buyerCount
                          }
                        </strong>{" "}
                        buyer
                        {company.buyerCount ===
                        1
                          ? ""
                          : "s"}
                      </span>

                      <span>
                        <strong className="font-medium">
                          {formatCurrency(
                            company.purchaseValue,
                          )}
                        </strong>{" "}
                        purchased
                      </span>

                      {!compact &&
                      company.marketCap >
                        0 ? (
                        <span className="text-[var(--ink-muted)]">
                          {formatCurrency(
                            company.marketCap,
                          )}{" "}
                          market cap
                        </span>
                      ) : null}
                    </span>
                  </span>

                  <span className="justify-self-start md:justify-self-end">
                    <span className="font-mono text-lg">
                      {Math.round(
                        company.rankScore,
                      )}
                    </span>

                    <span className="mt-1 block text-xs text-[var(--ink-muted)]">
                      evidence
                    </span>
                  </span>
                </div>
              </motion.li>
            );
          },
        )}
      </ol>

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
              transition={{
                duration: 0.28,
              }}
              className="border-t border-[var(--line-strong)] pt-5"
            >
              <p className="eyebrow">
                Why{" "}
                {selected.ticker}{" "}
                ranks here
              </p>

              <h3 className="mt-5 font-display text-4xl leading-[0.96] tracking-[-0.04em]">
                {
                  selected.headline
                }
              </h3>

              <p className="mt-4 text-sm font-medium">
                {
                  selected.companyName
                }
              </p>

              {[
                selected.sector,
                selected.industry,
              ].filter(Boolean)
                .length ? (
                <p className="mt-2 text-xs text-[var(--ink-soft)]">
                  {[
                    selected.sector,
                    selected.industry,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              ) : null}

              <p className="mt-5 text-sm leading-6 text-[var(--ink-muted)]">
                {selected.buyerCount >=
                2
                  ? `${selected.buyerCount} executives bought shares in the same company, creating independent confirmation.`
                  : "The signal currently rests on one executive purchase rather than coordinated buying."}
              </p>

              <dl className="mt-8 divide-y divide-[var(--line)] border-y border-[var(--line)]">
                <Fact
                  label="Combined evidence"
                  value={formatScore(
                    selected.rankScore,
                  )}
                />

                <Fact
                  label="Executive buyers"
                  value={String(
                    selected.buyerCount,
                  )}
                />

                <Fact
                  label="Capital committed"
                  value={formatCurrency(
                    selected.purchaseValue,
                  )}
                />

                <Fact
                  label="Behavior change"
                  value={formatScore(
                    selected.behaviorChange,
                  )}
                />

                {selected.currentPrice !== null ? (
                  <Fact
                    label="Latest price"
                    value={formatCurrency(
                      selected.currentPrice,
                    )}
                  />
                ) : null}

                {selected.marketCap >
                0 ? (
                  <Fact
                    label="Market capitalization"
                    value={formatCurrency(
                      selected.marketCap,
                    )}
                  />
                ) : null}
              </dl>

              <Link
                href={`/companies/${slugifyTicker(
                  selected.ticker,
                )}`}
                className="mt-7 inline-flex items-center gap-2 border-b border-[var(--ink)] pb-1 text-sm"
              >
                Open the evidence
                <ArrowUpRight className="size-4" />
              </Link>
            </motion.div>
          ) : null}
        </AnimatePresence>
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

      <dd className="font-mono text-sm">
        {value}
      </dd>
    </div>
  );
}
