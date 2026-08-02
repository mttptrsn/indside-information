import "server-only";

import { cache } from "react";
import { loadJson } from "@/lib/data/load-json";
import type {
  DailyActivityData,
  DiscoveriesData,
  FeaturedData,
  HeartbeatData,
  HomeData,
  OverviewData,
  SearchIndexData,
  SectorsData,
} from "@/types/home";

export const loadHomeData = cache(async (): Promise<HomeData> => {
  const [overview, discoveries, featured, sectors, activity, heartbeat] =
    await Promise.all([
      loadJson<OverviewData>("overview.json"),
      loadJson<DiscoveriesData>("discoveries.json"),
      loadJson<FeaturedData>("featured.json"),
      loadJson<SectorsData>("sectors.json"),
      loadJson<DailyActivityData>("activity/daily.json"),
      loadJson<HeartbeatData>("visualization/heartbeat.json"),
    ]);

  return {
    overview,
    discoveries,
    featured,
    sectors,
    activity,
    heartbeat,
  };
});

export const loadSearchItems = cache(async () => {
  const index = await loadJson<SearchIndexData>("search-index.json");
  return index.items;
});
