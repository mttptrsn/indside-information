import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: "neutral" | "accent" | "positive" | "warning" | "critical";
}

export function Badge({ className, tone = "neutral", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center border px-2.5 py-1 text-[0.6875rem] font-medium uppercase tracking-[0.14em]",
        {
          "border-[var(--line)] bg-[var(--surface)] text-[var(--ink-muted)]": tone === "neutral",
          "border-[color-mix(in_srgb,var(--accent)_48%,transparent)] bg-[color-mix(in_srgb,var(--accent)_10%,transparent)] text-[var(--accent-ink)]":
            tone === "accent",
          "border-[var(--positive-line)] bg-[var(--positive-bg)] text-[var(--positive)]": tone === "positive",
          "border-[var(--warning-line)] bg-[var(--warning-bg)] text-[var(--warning)]": tone === "warning",
          "border-[var(--critical-line)] bg-[var(--critical-bg)] text-[var(--critical)]": tone === "critical",
        },
        className,
      )}
      {...props}
    />
  );
}
