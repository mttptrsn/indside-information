import type { MethodologyData } from "@/types/interior";

export function MethodologyStory({
  data,
}: {
  data: MethodologyData;
}) {
  const signals = data.primary_signals ?? [];

  return (
    <article>
      <header className="editorial-container py-12 md:py-16">
        <p className="eyebrow">Method</p>
        <h1 className="mt-5 max-w-[11ch] font-display text-6xl leading-[0.9] tracking-[-0.06em] md:text-8xl">
          Four things make a purchase matter.
        </h1>
      </header>

      <section className="section-space border-y border-[var(--line)] bg-[var(--surface)]">
        <div className="editorial-container grid gap-6 md:grid-cols-2">
          {signals.slice(0, 4).map((signal, index) => (
            <div
              key={signal.id}
              className="flex min-h-64 flex-col justify-between border border-[var(--line)] p-7"
            >
              <span className="font-mono text-xs text-[var(--ink-soft)]">
                0{index + 1}
              </span>
              <div>
                <h2 className="font-display text-4xl leading-none">
                  {signal.label}
                </h2>
                <p className="mt-4 max-w-md text-sm leading-6 text-[var(--ink-muted)]">
                  {signal.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="editorial-container py-12">
        <p className="max-w-2xl text-sm leading-7 text-[var(--ink-muted)]">
          {data.causality}
        </p>
      </section>
    </article>
  );
}
