export type ActivityWindow = "1d" | "7d" | "30d" | "90d";

export type ActivityChangeType =
  | "all"
  | "new_cluster"
  | "silence_break"
  | "conviction_increase"
  | "large_purchase";

export interface ActivitySourceEvent {
  date?: string | null;
  transaction_date?: string | null;
  filing_date?: string | null;
  ticker?: string | null;
  company_name?: string | null;
  issuer_cik?: string | null;
  owner_cik?: string | null;
  owner_name?: string | null;
  sector?: string | null;
  industry?: string | null;
  purchase_value?: number | null;
  buyer_count?: number | null;
  conviction_score?: number | null;
  behavior_change_score?: number | null;
  cluster_score?: number | null;
  silence_break_score?: number | null;
  days_since_previous_purchase?: number | null;
  headline?: string | null;
  company_slug?: string | null;
  story_summary?: {
    percent_vs_average_purchase_price?: number | null;
    drawdown_from_52_week_high?: number | null;
  } | null;
}

export interface ActivityFeedItem {
  id: string;
  date: string;
  transactionDate: string;
  filingDate: string;
  ticker: string;
  companyName: string;
  companySlug: string;
  sector: string;
  purchaseValue: number;
  buyerCount: number;
  conviction: number;
  changeTypes: ActivityChangeType[];
  filingDelayDays: number | null;
  summary: string;
  detail: string;
}

export interface ActivityPeriodSummary {
  startDate: string;
  endDate: string;
  purchases: number;
  companies: number;
  buyers: number;
  purchaseValue: number;
  newClusters: number;
  silenceBreaks: number;
}

export interface SectorAccelerationItem {
  sector: string;
  currentPurchases: number;
  previousPurchases: number;
  multiplier: number;
  companies: number;
  buyers: number;
  purchaseValue: number;
}
