export interface Freshness {
  latest_sec_filing_date?: string;
  latest_price_date?: string;
  exported_at_utc?: string;
}

export interface DiscoveryItem {
  rank?: number | string | null;
  category?: string | null;
  ticker?: string | null;
  issuer_cik?: string | null;
  company_name?: string | null;
  company_slug?: string | null;
  headline?: string | null;
  purchase_value?: number | null;
  purchase_multiple?: number | null;
  ownership_increase_percent?: number | null;
  buyer_count?: number | null;
  score_quality?: string | null;
  ownership_increase_percentage?: number | null;
  operating_executive_count?: number | null;
  behavior_change_score?: number | null;
  conviction_score?: number | null;
  abnormality_score?: number | null;
  silence_break_score?: number | null;
  cluster_score?: number | null;
  market_cap?: number | null;
  sector?: string | null;
  industry?: string | null;
  transaction_date?: string | null;
  filing_date?: string | null;
  quality?: string | null;
  discovery_eligible?: boolean | string | null;
  reason_codes?: string[];
  source_accession_numbers?: string[];
  price_available?: boolean | null;
  story_path?: string | null;
  story_summary?: {
    current_price?: number | null;
    average_reported_purchase_price?: number | null;
    percent_vs_average_purchase_price?: number | null;
    return_since_latest_purchase?: number | null;
    drawdown_from_52_week_high?: number | null;
    return_63_sessions?: number | null;
    trend?: string;
  } | null;
}

export interface OverviewData {
  schema_version: string;
  generated_at_utc: string;
  as_of_date: string;
  freshness: Freshness;
  counts: {
    normalized_transactions?: number;
    qualifying_purchases?: number;
    purchase_events?: number;
    event_signals?: number;
    company_signals?: number;
    companies?: number;
    eligible_companies?: number;
    exceptional_signals?: number;
    cluster_signals?: number;
  };
  market_pulse: {
    median_behavior_change?: number | null;
    median_conviction?: number | null;
    total_reported_purchase_value?: number | null;
    active_company_count?: number;
  };
  featured_discoveries: DiscoveryItem[];
  quality_summary?: Record<string, number>;
  limitations?: string[];
}

export interface DiscoveriesData {
  schema_version: string;
  generated_at_utc: string;
  as_of_date: string;
  sections: Record<
    string,
    {
      count: number;
      items: DiscoveryItem[];
    }
  >;
}

export interface FeaturedData {
  schema_version: string;
  generated_at_utc: string;
  as_of_date: string;
  groups: Record<string, DiscoveryItem[]>;
}

export interface SectorItem {
  sector: string;
  signal_count: number;
  company_count: number;
  buyer_count: number;
  purchase_value: number | null;
  median_conviction: number | null;
  median_behavior_change: number | null;
  cluster_count: number;
  eligible_universe_share?: number;
}

export interface SectorsData {
  schema_version: string;
  generated_at_utc: string;
  as_of_date: string;
  sectors: SectorItem[];
}

export interface ActivityDay {
  date: string;
  event_count: number;
  company_count: number;
  buyer_count: number;
  purchase_value: number | null;
  median_conviction: number | null;
  largest_purchase: number | null;
}

export interface DailyActivityData {
  schema_version: string;
  generated_at_utc: string;
  as_of_date: string;
  days: ActivityDay[];
}

export interface HeartbeatItem {
  event_id?: string | null;
  date?: string | null;
  ticker?: string | null;
  company_name?: string | null;
  insider_name?: string | null;
  purchase_value?: number | null;
  amplitude?: number | null;
  intensity?: number | null;
  headline?: string | null;
}

export interface HeartbeatData {
  schema_version: string;
  generated_at_utc: string;
  as_of_date: string;
  beats: HeartbeatItem[];
}

export interface SearchItemData {
  type: "company" | "insider";
  slug: string;
  label: string;
  secondary?: string;
  ticker?: string;
  keywords?: Array<string | null>;
}

export interface SearchIndexData {
  schema_version: string;
  items: SearchItemData[];
}

export interface HomeData {
  overview: OverviewData;
  discoveries: DiscoveriesData;
  featured: FeaturedData;
  sectors: SectorsData;
  activity: DailyActivityData;
  heartbeat: HeartbeatData;
}
