import type { Metadata } from "next";
import { MethodologyStory } from "@/components/methodology/methodology-story";
import { loadMethodology } from "@/lib/data/interiors";

export const metadata: Metadata = {
  title: "Methodology",
  description: "How executive purchase behavior becomes transparent evidence.",
};

export default async function MethodologyPage() {
  const data = await loadMethodology();
  return <MethodologyStory data={data} />;
}
