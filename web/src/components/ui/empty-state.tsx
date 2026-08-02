import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function EmptyState({
  eyebrow = "No current evidence",
  title,
  description,
  actionLabel,
  actionHref,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
}) {
  return (
    <section className="relative overflow-hidden border-y border-[var(--line)] py-24 text-center">
      <span
        className="absolute left-1/2 top-1/2 size-80 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[var(--line)]"
        aria-hidden="true"
      />
      <span
        className="absolute left-1/2 top-1/2 size-52 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[var(--line)]"
        aria-hidden="true"
      />
      <div className="relative editorial-container">
        <p className="eyebrow">{eyebrow}</p>
        <h2 className="mx-auto mt-6 max-w-[12ch] font-display text-5xl leading-[0.94] tracking-[-0.04em] md:text-7xl">
          {title}
        </h2>
        <p className="mx-auto mt-6 max-w-lg leading-7 text-[var(--ink-muted)]">
          {description}
        </p>
        {actionLabel && actionHref ? (
          <Link
            href={actionHref}
            className="mt-9 inline-flex items-center gap-3 border-b border-[var(--ink)] pb-1 text-sm"
          >
            {actionLabel}
            <ArrowRight className="size-4" />
          </Link>
        ) : null}
      </div>
    </section>
  );
}
