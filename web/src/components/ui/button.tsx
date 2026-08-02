import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "text";
  size?: "sm" | "md" | "lg";
}

export function Button({
  className,
  variant = "primary",
  size = "md",
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 border font-medium transition-[background-color,color,border-color,transform] duration-300 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--canvas)] disabled:pointer-events-none disabled:opacity-45",
        {
          "border-[var(--ink)] bg-[var(--ink)] text-[var(--canvas)] hover:-translate-y-px hover:bg-[var(--ink-soft)]":
            variant === "primary",
          "border-[var(--line)] bg-[var(--surface)] text-[var(--ink)] hover:border-[var(--ink-muted)] hover:bg-[var(--surface-raised)]":
            variant === "secondary",
          "border-transparent bg-transparent text-[var(--ink)] hover:bg-[var(--surface-raised)]":
            variant === "ghost",
          "border-transparent bg-transparent px-0 text-[var(--ink)] underline decoration-[var(--line-strong)] underline-offset-4 hover:decoration-[var(--ink)]":
            variant === "text",
          "h-9 px-3 text-sm": size === "sm",
          "h-11 px-5 text-sm": size === "md",
          "h-13 px-7 text-base": size === "lg",
        },
        className,
      )}
      {...props}
    />
  );
}
