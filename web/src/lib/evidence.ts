import type { DiscoveryItem } from "@/types/home";

export type EvidenceMode =
  | "overall"
  | "together"
  | "silence"
  | "ownership"
  | "drawdown"
  | "below_cost"
  | "small_cap";

export interface EvidenceCompany extends DiscoveryItem {
  evidence_score: number;
  score_components: {
    conviction: number;
    behavior_change: number;
    cluster: number;
    abnormality: number;
    silence_break: number;
    ownership: number;
    role_quality: number;
    data_quality: number;
  };
  percentiles: {
    purchase_value: number;
    buyer_count: number;
    behavior_change: number;
    ownership_increase: number;
    conviction: number;
  };
}

function finite(value: unknown): number {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function percentile(values: number[], value: number): number {
  const valid = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (!valid.length) return 0;

  let count = 0;
  for (const candidate of valid) {
    if (candidate <= value) count += 1;
  }

  return Math.round((count / valid.length) * 100);
}

export function enrichEvidence(
  items: DiscoveryItem[],
): EvidenceCompany[] {
  const purchaseValues = items.map((item) =>
    finite(item.purchase_value),
  );
  const buyerCounts = items.map((item) =>
    finite(item.buyer_count),
  );
  const behaviorScores = items.map((item) =>
    finite(item.behavior_change_score),
  );
  const ownershipScores = items.map((item) =>
    finite(
      item.ownership_increase_percent ??
        item.ownership_increase_percentage,
    ),
  );
  const convictionScores = items.map((item) =>
    finite(item.conviction_score),
  );

  return items.map((item) => {
    const conviction = finite(item.conviction_score);
    const behaviorChange = finite(
      item.behavior_change_score,
    );
    const cluster = finite(item.cluster_score);
    const abnormality = finite(item.abnormality_score);
    const silenceBreak = finite(item.silence_break_score);
    const ownership = Math.min(
      100,
      Math.max(
        0,
        finite(
      item.ownership_increase_percent ??
        item.ownership_increase_percentage,
    ),
      ),
    );
    const roleQuality = Math.min(
      100,
      Math.max(
        0,
        finite(item.operating_executive_count) * 18 +
          finite(item.buyer_count) * 4,
      ),
    );
    const dataQuality =
      String(item.score_quality ?? "").toLowerCase() === "high"
        ? 100
        : String(item.score_quality ?? "").toLowerCase() ===
            "acceptable"
          ? 78
          : String(item.score_quality ?? "").toLowerCase() ===
              "limited"
            ? 52
            : 30;

    const evidenceScore =
      conviction * 0.34 +
      behaviorChange * 0.18 +
      cluster * 0.15 +
      abnormality * 0.12 +
      silenceBreak * 0.08 +
      ownership * 0.06 +
      roleQuality * 0.04 +
      dataQuality * 0.03;

    return {
      ...item,
      evidence_score: Math.round(evidenceScore),
      score_components: {
        conviction: Math.round(conviction),
        behavior_change: Math.round(behaviorChange),
        cluster: Math.round(cluster),
        abnormality: Math.round(abnormality),
        silence_break: Math.round(silenceBreak),
        ownership: Math.round(ownership),
        role_quality: Math.round(roleQuality),
        data_quality: Math.round(dataQuality),
      },
      percentiles: {
        purchase_value: percentile(
          purchaseValues,
          finite(item.purchase_value),
        ),
        buyer_count: percentile(
          buyerCounts,
          finite(item.buyer_count),
        ),
        behavior_change: percentile(
          behaviorScores,
          behaviorChange,
        ),
        ownership_increase: percentile(
          ownershipScores,
          ownership,
        ),
        conviction: percentile(
          convictionScores,
          conviction,
        ),
      },
    };
  });
}

export function modeScore(
  item: EvidenceCompany,
  mode: EvidenceMode,
): number {
  switch (mode) {
    case "together":
      return (
        item.score_components.cluster * 0.55 +
        Math.min(100, finite(item.buyer_count) * 12) * 0.45
      );
    case "silence":
      return (
        item.score_components.silence_break * 0.65 +
        item.score_components.behavior_change * 0.35
      );
    case "ownership":
      return (
        item.score_components.ownership * 0.7 +
        item.score_components.conviction * 0.3
      );
    case "drawdown":
      return (
        Math.min(
          100,
          Math.abs(
            finite(
              item.story_summary?.drawdown_from_52_week_high,
            ),
          ),
        ) *
          0.45 +
        item.score_components.conviction * 0.55
      );
    case "below_cost":
      return (
        Math.min(
          100,
          Math.max(
            0,
            -finite(
              item.story_summary
                ?.percent_vs_average_purchase_price,
            ),
          ) * 4,
        ) *
          0.55 +
        item.score_components.conviction * 0.45
      );
    case "small_cap":
      return (
        item.score_components.conviction * 0.45 +
        item.score_components.behavior_change * 0.35 +
        Math.max(
          0,
          100 -
            Math.log10(
              Math.max(finite(item.market_cap), 1),
            ) *
              8,
        ) *
          0.2
      );
    case "overall":
    default:
      return item.evidence_score;
  }
}
