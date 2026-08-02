import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Reveal } from "@/components/motion/reveal";

export function ChapterHero({
  index,
  eyebrow,
  title,
  description,
  aside,
  children,
}: {
  index?: string;
  eyebrow: string;
  title: string;
  description?: string;
  aside?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <header className="border-b border-[var(--line)]">
      <div className="editorial-container py-16 md:py-24">
        <Reveal>
          <div className="flex flex-wrap items-center justify-between gap-5">
            <Badge tone="accent">{index ? `${index} · ${eyebrow}` : eyebrow}</Badge>
            {aside}
          </div>
        </Reveal>
        <div className="mt-12 grid gap-10 lg:grid-cols-12 lg:items-end">
          <Reveal className="lg:col-span-8" delay={0.04}>
            <h1 className="display-section max-w-[13ch]">{title}</h1>
          </Reveal>
          <Reveal className="lg:col-span-4" delay={0.11}>
            {description ? (
              <p className="max-w-md text-lg leading-8 text-[var(--ink-muted)]">
                {description}
              </p>
            ) : null}
            {children}
          </Reveal>
        </div>
      </div>
    </header>
  );
}
