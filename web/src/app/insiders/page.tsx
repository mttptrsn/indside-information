import type { Metadata } from "next";
import { InsiderIndex } from "@/components/insider/insider-index";
import { loadInsiderIndex } from "@/lib/data/interiors";

export const metadata: Metadata = {
  title: "Executives",
  description: "Browse executive purchase histories.",
};

export default async function InsidersPage() {
  const data = await loadInsiderIndex();

  return (
    <>
      <header className="editorial-container py-12 md:py-16">
        <p className="eyebrow">Executives</p>
        <h1 className="mt-5 font-display text-6xl leading-[0.9] tracking-[-0.06em] md:text-8xl">
          Choose a person.
        </h1>
      </header>
      <InsiderIndex insiders={data.items} />
    </>
  );
}
