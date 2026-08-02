import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { InsiderProfile } from "@/components/insider/insider-profile";
import {
  loadInsiderDossier,
  loadInsiderIndex,
} from "@/lib/data/interiors";
import { text } from "@/lib/record";

export async function generateStaticParams() {
  const index = await loadInsiderIndex();
  return index.items.map((insider) => ({ ownerCik: insider.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ ownerCik: string }>;
}): Promise<Metadata> {
  const { ownerCik } = await params;
  const dossier = await loadInsiderDossier(ownerCik).catch(() => null);

  if (!dossier) {
    return { title: "Executive profile" };
  }

  const name =
    text(
      dossier.insider,
      "display_name",
      "canonical_name",
      "owner_name",
    ) || "Executive profile";

  return {
    title: name,
    description: `Causal purchase history and behavioral profile for ${name}.`,
  };
}

export default async function InsiderPage({
  params,
}: {
  params: Promise<{ ownerCik: string }>;
}) {
  const { ownerCik } = await params;
  const dossier = await loadInsiderDossier(ownerCik).catch(() => null);

  if (!dossier) {
    notFound();
  }

  return <InsiderProfile dossier={dossier} />;
}
