import { ArrowUpRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function EvidenceCard({
  category,
  headline,
  summary,
  meta,
}: {
  category: string;
  headline: string;
  summary: string;
  meta?: string;
}) {
  return (
    <article className="group border-t border-[var(--line)] py-6 transition-colors duration-300 hover:border-[var(--ink-muted)]">
      <div className="flex items-start justify-between gap-6">
        <Badge>{category}</Badge>
        <ArrowUpRight className="size-4 text-[var(--ink-muted)] transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden="true" />
      </div>
      <h3 className="mt-8 max-w-xl font-display text-3xl leading-[1.02] tracking-[-0.03em] text-[var(--ink)] md:text-4xl">{headline}</h3>
      <p className="mt-5 max-w-2xl text-sm leading-6 text-[var(--ink-muted)]">{summary}</p>
      {meta ? <p className="mt-8 font-mono text-xs uppercase tracking-[0.12em] text-[var(--ink-soft)]">{meta}</p> : null}
    </article>
  );
}
