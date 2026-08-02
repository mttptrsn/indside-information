import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/cn";

export function ArticleCard({
  href,
  kicker,
  title,
  excerpt,
  className,
}: {
  href: string;
  kicker: string;
  title: string;
  excerpt: string;
  className?: string;
}) {
  return (
    <Link href={href} className={cn("group block border-t border-[var(--line)] pt-5", className)}>
      <p className="text-xs uppercase tracking-[0.18em] text-[var(--ink-muted)]">{kicker}</p>
      <h3 className="mt-8 max-w-2xl font-display text-4xl leading-[1] tracking-[-0.035em] text-[var(--ink)] md:text-5xl">{title}</h3>
      <p className="mt-5 max-w-xl text-sm leading-6 text-[var(--ink-muted)]">{excerpt}</p>
      <span className="mt-8 inline-flex items-center gap-2 text-sm text-[var(--ink)]">
        Read the evidence
        <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true" />
      </span>
    </Link>
  );
}
