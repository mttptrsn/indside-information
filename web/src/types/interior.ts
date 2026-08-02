import type { DiscoveryItem, Freshness } from "@/types/home";

export interface CompanyIndexItem {
  slug: string;
  ticker?: string | null;
  issuer_cik?: string | null;
  company_name?: string | null;
  sector?: string | null;
  industry?: string | null;
  market_cap?: number | null;
  discovery_eligible?: boolean | string | null;
  current_signal?: Record<string, unknown> | null;
  story_path?: string | null;
  price_available?: boolean | null;
  story_summary?: {
    price_date?: string | null;
    current_price?: number | null;
    average_reported_purchase_price?: number | null;
    percent_vs_average_purchase_price?: number | null;
    return_since_latest_purchase?: number | null;
    drawdown_from_52_week_high?: number | null;
    return_63_sessions?: number | null;
    trend?: string;
  } | null;
}

export interface CompanyIndexData {
  schema_version: string;
  generated_at_utc: string;
  as_of_date: string;
  count: number;
  items: CompanyIndexItem[];
}

export interface CompanyDossier {
  schema_version: string;
  generated_at_utc: string;
  as_of_date: string;
  freshness: Freshness;
  limitations?: string[];
  company: Record<string, unknown>;
  current_signal?: Record<string, unknown> | null;
  latest_event_signal?: Record<string, unknown> | null;
  buyers: Array<Record<string, unknown>>;
  purchase_events: Array<Record<string, unknown>>;
  purchase_campaigns: Array<Record<string, unknown>>;
  executive_histories: Array<Record<string, unknown>>;
  event_signals: Array<Record<string, unknown>>;
  qualifying_transactions: Array<Record<string, unknown>>;
  stats: {
    purchase_event_count?: number;
    unique_buyer_count?: number;
    total_purchase_value?: number | null;
    largest_purchase_value?: number | null;
    median_conviction?: number | null;
    highest_behavior_change?: number | null;
  };
}

export interface InsiderIndexItem {
  slug: string;
  insider_id?: string | null;
  owner_cik?: string | null;
  name?: string | null;
  roles?: string | null;
  behavior_profile?: Record<string, unknown>;
}

export interface InsiderIndexData {
  schema_version: string;
  generated_at_utc: string;
  as_of_date: string;
  count: number;
  items: InsiderIndexItem[];
}

export interface InsiderDossier {
  schema_version: string;
  generated_at_utc: string;
  as_of_date: string;
  freshness: Freshness;
  insider: Record<string, unknown>;
  companies: Array<Record<string, unknown>>;
  purchase_events: Array<Record<string, unknown>>;
  histories: Array<Record<string, unknown>>;
  signals: Array<Record<string, unknown>>;
  behavior_profile: {
    purchase_count?: number;
    company_count?: number;
    total_purchase_value?: number | null;
    median_purchase_value?: number | null;
    largest_purchase_value?: number | null;
    median_days_between_purchases?: number | null;
    highest_behavior_change?: number | null;
    highest_conviction?: number | null;
  };
}

export interface MethodologyData {
  schema_version: string;
  generated_at_utc: string;
  as_of_date: string;
  freshness?: Freshness;
  product_principle?: string;
  qualifying_purchase_rule?: Record<string, unknown>;
  primary_signals?: Array<{
    id: string;
    label: string;
    description: string;
  }>;
  score_distinction?: {
    behavior_change?: string;
    conviction?: string;
  };
  causality?: string;
  limitations?: string[];
}

export interface StatusData {
  schema_version: string;
  generated_at_utc: string;
  as_of_date: string;
  freshness: Freshness;
  pipeline: {
    version?: string;
    latest_run_id?: string;
    overall_status?: string;
    stage_statuses?: Record<string, string>;
    warnings?: string[];
    errors?: string[];
  };
  source_counts?: Record<string, number>;
  source_summaries?: Record<string, unknown>;
}

export interface DiscoveryFilters {
  category: string;
  sector: string;
  minimumConviction: number;
  minimumPurchase: number;
  role: string;
  directOnly: boolean;
  query: string;
}

export interface DiscoveryPageData {
  items: DiscoveryItem[];
  sectors: string[];
  categories: string[];
}


export interface CompanyStoryPricePoint {
  date: string;
  close?: number | null;
  adjusted_close?: number | null;
  volume?: number | null;
}

export interface CompanyStoryPurchaseMarker {
  event_id?: string | null;
  transaction_date: string;
  price_date?: string | null;
  market_price?: number | null;
  reported_purchase_price?: number | null;
  purchase_value?: number | null;
  shares?: number | null;
  owner_cik?: string | null;
  owner_name?: string | null;
  roles?: string | null;
  direct_indirect?: string | null;
  ownership_increase_percent?: number | null;
  conviction_score?: number | null;
  behavior_change_score?: number | null;
  headline?: string | null;
}

export interface CompanyStoryData {
  schema_version: string;
  generated_at_utc: string;
  as_of_date: string;
  freshness: Freshness;
  ticker?: string | null;
  yf_ticker?: string | null;
  issuer_cik?: string | null;
  company_name?: string | null;
  sector?: string | null;
  industry?: string | null;
  price_available: boolean;
  price_unavailable_reason?: string;
  price_path: CompanyStoryPricePoint[];
  purchase_markers: CompanyStoryPurchaseMarker[];
  summary: {
    price_date?: string | null;
    current_price?: number | null;
    average_reported_purchase_price?: number | null;
    percent_vs_average_purchase_price?: number | null;
    first_purchase_date?: string | null;
    latest_purchase_date?: string | null;
    return_since_first_purchase?: number | null;
    return_since_latest_purchase?: number | null;
    drawdown_from_52_week_high?: number | null;
    drawdown_from_3_year_high?: number | null;
    distance_from_200_day_average?: number | null;
    return_63_sessions?: number | null;
    realized_volatility_63d?: number | null;
    volatility_percentile?: number | null;
    trend?: string;
    buyers?: number;
    purchase_days?: number;
    purchase_events?: number;
    total_reported_purchase_value?: number | null;
  };
  quality?: Record<string, unknown>;
  limitations?: string[];
}
