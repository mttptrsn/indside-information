import type { MetadataRoute } from "next";
import {
  loadCompanyIndex,
  loadInsiderIndex,
} from "@/lib/data/interiors";

const BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://example.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [companies, insiders] = await Promise.all([
    loadCompanyIndex(),
    loadInsiderIndex(),
  ]);

  const staticRoutes = [
    "",
    "/discoveries",
    "/activity",
    "/companies",
    "/insiders",
    "/methodology",
    "/status",
  ];

  return [
    ...staticRoutes.map((route) => ({
      url: `${BASE_URL}${route}`,
      changeFrequency: route === "" ? "daily" as const : "weekly" as const,
      priority: route === "" ? 1 : 0.8,
    })),
    ...companies.items.map((company) => ({
      url: `${BASE_URL}/companies/${company.slug}`,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    ...insiders.items.map((insider) => ({
      url: `${BASE_URL}/insiders/${insider.slug}`,
      changeFrequency: "monthly" as const,
      priority: 0.55,
    })),
  ];
}
