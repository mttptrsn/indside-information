import { SignalLandscape } from "@/components/visuals/signal-landscape";
import type { DiscoveryItem } from "@/types/home";

export function VisualSignalField({
  items,
}: {
  items: DiscoveryItem[];
}) {
  return (
    <section className="section-space border-y border-[var(--line)] bg-[var(--surface)]">
      <div className="editorial-container">
        <div className="mb-12 flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="eyebrow">What changed today?</p>
            <h2 className="mt-5 max-w-[13ch] font-display text-6xl leading-[0.92] tracking-[-0.055em] md:text-8xl">
              Find the unusual purchase before reading a word.
            </h2>
          </div>
          <p className="max-w-sm text-sm leading-6 text-[var(--ink-muted)]">
            Move across the landscape. Higher means stronger evidence. Larger
            means more money committed. Thicker rings mean a larger break from
            the executive’s own history.
          </p>
        </div>

        <SignalLandscape items={items} />
      </div>
    </section>
  );
}
