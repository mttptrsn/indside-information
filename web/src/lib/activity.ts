import type {
  ActivityChangeType,
  ActivityFeedItem,
  ActivityPeriodSummary,
  ActivitySourceEvent,
  ActivityWindow,
  SectorAccelerationItem,
} from "@/types/activity";

const DAY = 86_400_000;

function numberValue(value: unknown): number {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function textValue(value: unknown): string {
  const result = String(value ?? "").trim();

  if (
    !result ||
    ["none", "null", "nan", "undefined"].includes(
      result.toLowerCase(),
    )
  ) {
    return "";
  }

  return result;
}

function timestamp(value: unknown): number {
  const raw = String(value ?? "").trim();

  if (!raw) {
    return 0;
  }

  const compact = raw.match(
    /^(\d{4})(\d{2})(\d{2})$/,
  );

  if (compact) {
    const [, year, month, day] = compact;

    return Date.UTC(
      Number(year),
      Number(month) - 1,
      Number(day),
    );
  }

  const dateOnly = raw.match(
    /^(\d{4})-(\d{2})-(\d{2})$/,
  );

  if (dateOnly) {
    const [, year, month, day] = dateOnly;

    return Date.UTC(
      Number(year),
      Number(month) - 1,
      Number(day),
    );
  }

  const result = Date.parse(raw);

  return Number.isFinite(result)
    ? result
    : 0;
}

function isoDate(value: unknown): string {
  const time = timestamp(value);

  return time
    ? new Date(time).toISOString().slice(0, 10)
    : "";
}

export function windowDays(window: ActivityWindow): number {
  switch (window) {
    case "1d":
      return 1;
    case "30d":
      return 30;
    case "90d":
      return 90;
    case "7d":
    default:
      return 7;
  }
}

export function filterWindow(
  items: ActivitySourceEvent[],
  window: ActivityWindow,
  anchorDate?: string,
): {
  current: ActivitySourceEvent[];
  previous: ActivitySourceEvent[];
  start: number;
  end: number;
} {
  const dates = items
    .map((item) =>
      timestamp(
        item.filing_date ??
          item.date ??
          item.transaction_date,
      ),
    )
    .filter((value) => value > 0);

  const end = anchorDate
    ? timestamp(anchorDate)
    : dates.length
      ? Math.max(...dates)
      : Date.now();

  const days = windowDays(window);
  const start = end - (days - 1) * DAY;
  const previousEnd = start - DAY;
  const previousStart = previousEnd - (days - 1) * DAY;

  const current = items.filter((item) => {
    const value = timestamp(
      item.filing_date ??
        item.date ??
        item.transaction_date,
    );
    return value >= start && value <= end + DAY - 1;
  });

  const previous = items.filter((item) => {
    const value = timestamp(
      item.filing_date ??
        item.date ??
        item.transaction_date,
    );
    return value >= previousStart && value <= previousEnd + DAY - 1;
  });

  return { current, previous, start, end };
}

function companyIdentity(item: ActivitySourceEvent): string {
  return [
    textValue(item.issuer_cik),
    textValue(item.ticker).toUpperCase(),
    textValue(item.company_name).toLowerCase(),
  ]
    .filter(Boolean)
    .join("|");
}

function buyerIdentity(item: ActivitySourceEvent): string {
  return (
    textValue(item.owner_cik) ||
    textValue(item.owner_name).toLowerCase()
  );
}

function changeTypes(
  item: ActivitySourceEvent,
): ActivityChangeType[] {
  const types: ActivityChangeType[] = [];
  const buyers = numberValue(item.buyer_count);
  const cluster = numberValue(item.cluster_score);
  const silence = numberValue(item.silence_break_score);
  const gap = numberValue(item.days_since_previous_purchase);
  const conviction = numberValue(item.conviction_score);
  const behavior = numberValue(item.behavior_change_score);
  const value = numberValue(item.purchase_value);

  if (buyers >= 2 || cluster >= 60) {
    types.push("new_cluster");
  }

  if (silence >= 60 || gap >= 365) {
    types.push("silence_break");
  }

  if (conviction >= 75 && behavior >= 60) {
    types.push("conviction_increase");
  }

  if (value >= 500_000) {
    types.push("large_purchase");
  }

  return types;
}

function filingDelay(
  transactionDate: string,
  filingDate: string,
): number | null {
  const transaction = timestamp(transactionDate);
  const filing = timestamp(filingDate);

  if (!transaction || !filing) {
    return null;
  }

  return Math.max(
    0,
    Math.round((filing - transaction) / DAY),
  );
}

function summaryFor(
  item: ActivitySourceEvent,
  buyers: number,
  totalValue: number,
  types: ActivityChangeType[],
): string {
  const ticker = textValue(item.ticker).toUpperCase();

  if (types.includes("new_cluster") && buyers >= 2) {
    return `${buyers} executives are now buying ${ticker}.`;
  }

  if (types.includes("silence_break")) {
    return `An executive returned to buy ${ticker} after a long absence.`;
  }

  if (types.includes("conviction_increase")) {
    return `The evidence around ${ticker} strengthened materially.`;
  }

  if (types.includes("large_purchase")) {
    return `${ticker} disclosed a large open-market purchase.`;
  }

  return `${ticker} reported qualifying insider buying.`;
}

function detailFor(
  item: ActivitySourceEvent,
  totalValue: number,
  buyers: number,
): string {
  const priceContext = numberValue(
    item.story_summary?.percent_vs_average_purchase_price,
  );

  const parts = [
    `${buyers} buyer${buyers === 1 ? "" : "s"} committed ${currency(
      totalValue,
    )}.`,
  ];

  if (
    item.story_summary &&
    Number.isFinite(priceContext)
  ) {
    parts.push(
      `The latest price is ${Math.abs(priceContext).toFixed(
        1,
      )}% ${
        priceContext >= 0 ? "above" : "below"
      } their average reported cost.`,
    );
  }

  return parts.join(" ");
}

export function buildActivityFeed(
  items: ActivitySourceEvent[],
): ActivityFeedItem[] {
  const grouped = new Map<
    string,
    ActivitySourceEvent[]
  >();

  for (const item of items) {
    const ticker = textValue(item.ticker).toUpperCase();
    const filingDate = isoDate(
      item.filing_date ??
        item.date ??
        item.transaction_date,
    );

    if (!ticker || !filingDate) {
      continue;
    }

    const key = `${filingDate}|${companyIdentity(item)}`;
    const current = grouped.get(key) ?? [];
    current.push(item);
    grouped.set(key, current);
  }

  return [...grouped.entries()]
    .map(([id, group]) => {
      const first = group[0];
      const buyerSet = new Set(
        group.map(buyerIdentity).filter(Boolean),
      );

      const buyerCount = Math.max(
        buyerSet.size,
        ...group.map((item) =>
          numberValue(item.buyer_count),
        ),
        1,
      );

      const purchaseValue = group.reduce(
        (sum, item) =>
          sum + numberValue(item.purchase_value),
        0,
      );

      const types = [
        ...new Set(
          group.flatMap((item) => changeTypes(item)),
        ),
      ];

      const filingDate = isoDate(
        first.filing_date ??
          first.date ??
          first.transaction_date,
      );
      const transactionDate = isoDate(
        first.transaction_date ??
          first.date ??
          first.filing_date,
      );

      return {
        id,
        date: filingDate,
        transactionDate,
        filingDate,
        ticker: textValue(first.ticker).toUpperCase(),
        companyName:
          textValue(first.company_name) ||
          textValue(first.ticker).toUpperCase(),
        companySlug: textValue(first.company_slug),
        sector: textValue(first.sector) || "Unclassified",
        purchaseValue,
        buyerCount,
        conviction: Math.max(
          ...group.map((item) =>
            numberValue(item.conviction_score),
          ),
          0,
        ),
        changeTypes: types,
        filingDelayDays: filingDelay(
          transactionDate,
          filingDate,
        ),
        summary: summaryFor(
          first,
          buyerCount,
          purchaseValue,
          types,
        ),
        detail: detailFor(
          first,
          purchaseValue,
          buyerCount,
        ),
      };
    })
    .sort(
      (left, right) =>
        timestamp(right.filingDate) -
          timestamp(left.filingDate) ||
        right.conviction - left.conviction ||
        right.purchaseValue - left.purchaseValue,
    );
}

export function summarizePeriod(
  items: ActivitySourceEvent[],
  start: number,
  end: number,
): ActivityPeriodSummary {
  const companies = new Set(
    items.map(companyIdentity).filter(Boolean),
  );
  const buyers = new Set(
    items.map(buyerIdentity).filter(Boolean),
  );

  return {
    startDate: new Date(start).toISOString().slice(0, 10),
    endDate: new Date(end).toISOString().slice(0, 10),
    purchases: items.length,
    companies: companies.size,
    buyers: buyers.size,
    purchaseValue: items.reduce(
      (sum, item) =>
        sum + numberValue(item.purchase_value),
      0,
    ),
    newClusters: items.filter((item) =>
      changeTypes(item).includes("new_cluster"),
    ).length,
    silenceBreaks: items.filter((item) =>
      changeTypes(item).includes("silence_break"),
    ).length,
  };
}

export function sectorAcceleration(
  current: ActivitySourceEvent[],
  previous: ActivitySourceEvent[],
): SectorAccelerationItem[] {
  const currentGroups = groupBySector(current);
  const previousGroups = groupBySector(previous);

  const sectors = new Set([
    ...currentGroups.keys(),
    ...previousGroups.keys(),
  ]);

  return [...sectors]
    .map((sector) => {
      const currentItems =
        currentGroups.get(sector) ?? [];
      const previousItems =
        previousGroups.get(sector) ?? [];

      const currentPurchases =
        currentItems.length;
      const previousPurchases =
        previousItems.length;

      return {
        sector,
        currentPurchases,
        previousPurchases,
        multiplier:
          previousPurchases > 0
            ? currentPurchases / previousPurchases
            : currentPurchases > 0
              ? currentPurchases
              : 0,
        companies: new Set(
          currentItems
            .map(companyIdentity)
            .filter(Boolean),
        ).size,
        buyers: new Set(
          currentItems
            .map(buyerIdentity)
            .filter(Boolean),
        ).size,
        purchaseValue: currentItems.reduce(
          (sum, item) =>
            sum + numberValue(item.purchase_value),
          0,
        ),
      };
    })
    .filter((item) => item.currentPurchases > 0)
    .sort(
      (left, right) =>
        right.multiplier - left.multiplier ||
        right.currentPurchases - left.currentPurchases,
    );
}

function groupBySector(
  items: ActivitySourceEvent[],
): Map<string, ActivitySourceEvent[]> {
  const groups = new Map<
    string,
    ActivitySourceEvent[]
  >();

  for (const item of items) {
    const sector =
      textValue(item.sector) || "Unclassified";
    const current = groups.get(sector) ?? [];
    current.push(item);
    groups.set(sector, current);
  }

  return groups;
}

export function currency(value: number): string {
  const absolute = Math.abs(value);
  const sign = value < 0 ? "-" : "";

  if (absolute >= 1_000_000_000) {
    return `${sign}$${trimDecimal(
      absolute / 1_000_000_000,
    )}B`;
  }

  if (absolute >= 1_000_000) {
    return `${sign}$${trimDecimal(
      absolute / 1_000_000,
    )}M`;
  }

  if (absolute >= 1_000) {
    return `${sign}$${trimDecimal(
      absolute / 1_000,
    )}K`;
  }

  return `${sign}$${Math.round(absolute)}`;
}

function trimDecimal(value: number): string {
  return value
    .toFixed(1)
    .replace(/\.0$/, "");
}

export function changePercent(
  current: number,
  previous: number,
): number | null {
  if (previous === 0) {
    return current === 0 ? 0 : null;
  }

  return ((current - previous) / previous) * 100;
}
