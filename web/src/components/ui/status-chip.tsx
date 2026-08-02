import { cn } from "@/lib/cn";

export function StatusChip({
  label,
  status = "current",
  className,
}: {
  label: string;
  status?: "current" | "limited" | "stale" | "failed";
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-[var(--ink-muted)]", className)}>
      <span
        aria-hidden="true"
        className={cn("size-1.5 rounded-full", {
          "bg-[var(--positive)]": status === "current",
          "bg-[var(--warning)]": status === "limited" || status === "stale",
          "bg-[var(--critical)]": status === "failed",
        })}
      />
      {label}
    </span>
  );
}
