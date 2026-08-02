import { cn } from "@/lib/cn";

export function SectionHeader({
  eyebrow,
  title,
  description,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  className?: string;
}) {
  return (
    <header className={cn("grid gap-5 border-t border-[var(--line)] pt-5 md:grid-cols-12", className)}>
      {eyebrow ? (
        <p className="text-xs uppercase tracking-[0.18em] text-[var(--ink-muted)] md:col-span-3">{eyebrow}</p>
      ) : null}
      <div className="md:col-span-8 md:col-start-5">
        <h2 className="font-display text-4xl leading-[0.98] tracking-[-0.035em] text-[var(--ink)] md:text-6xl">{title}</h2>
        {description ? <p className="mt-5 max-w-2xl text-base leading-7 text-[var(--ink-muted)]">{description}</p> : null}
      </div>
    </header>
  );
}
