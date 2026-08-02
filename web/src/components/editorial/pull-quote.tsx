export function PullQuote({ quote, attribution }: { quote: string; attribution?: string }) {
  return (
    <figure className="border-y border-[var(--line)] py-10 md:py-14">
      <blockquote className="max-w-4xl font-display text-4xl leading-[1.02] tracking-[-0.035em] text-[var(--ink)] md:text-6xl">
        “{quote}”
      </blockquote>
      {attribution ? <figcaption className="mt-6 text-xs uppercase tracking-[0.18em] text-[var(--ink-muted)]">{attribution}</figcaption> : null}
    </figure>
  );
}
