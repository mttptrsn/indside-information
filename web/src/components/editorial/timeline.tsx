import { cn } from "@/lib/cn";

export interface TimelineItem {
  date: string;
  title: string;
  description?: string;
  emphasized?: boolean;
}

export function Timeline({ items }: { items: TimelineItem[] }) {
  return (
    <ol className="relative border-l border-[var(--line)]">
      {items.map((item) => (
        <li key={`${item.date}-${item.title}`} className="relative ml-6 pb-10 last:pb-0">
          <span
            className={cn(
              "absolute -left-[1.72rem] top-1 size-2 rounded-full border border-[var(--canvas)] bg-[var(--ink-muted)]",
              item.emphasized && "size-3 -left-[1.84rem] bg-[var(--accent)]",
            )}
            aria-hidden="true"
          />
          <time className="font-mono text-xs uppercase tracking-[0.12em] text-[var(--ink-soft)]">{item.date}</time>
          <h3 className="mt-2 font-display text-2xl tracking-[-0.02em] text-[var(--ink)]">{item.title}</h3>
          {item.description ? <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--ink-muted)]">{item.description}</p> : null}
        </li>
      ))}
    </ol>
  );
}
