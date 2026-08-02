"use client";

import { motion, useReducedMotion } from "framer-motion";
import { formatCurrency, formatScore } from "@/lib/format";

export function SignalBubble({
  ticker,
  purchaseValue,
  conviction,
  behaviorChange,
  buyerCount = 1,
  selected = false,
  onClick,
}: {
  ticker: string;
  purchaseValue?: number | null;
  conviction?: number | null;
  behaviorChange?: number | null;
  buyerCount?: number | null;
  selected?: boolean;
  onClick?: () => void;
}) {
  const reducedMotion = useReducedMotion();
  const size = Math.max(
    88,
    Math.min(220, 88 + Math.sqrt(Math.max(purchaseValue ?? 0, 0)) / 90),
  );
  const ring = Math.max(1, Math.min(8, (behaviorChange ?? 0) / 14));
  const opacity = Math.max(0.34, Math.min(1, (conviction ?? 0) / 100));

  return (
    <motion.button
      type="button"
      onClick={onClick}
      className="relative grid place-items-center rounded-full border bg-[var(--surface)] text-center shadow-[var(--shadow-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
      style={{
        width: size,
        height: size,
        borderWidth: ring,
        borderColor: selected ? "var(--accent)" : "var(--line-strong)",
        opacity,
      }}
      animate={
        reducedMotion
          ? undefined
          : {
              scale: selected ? 1.06 : 1,
            }
      }
      whileHover={reducedMotion ? undefined : { scale: 1.05 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      aria-label={`${ticker}, ${formatCurrency(
        purchaseValue,
      )} purchase, conviction ${formatScore(conviction)}`}
    >
      {Array.from({ length: Math.max(0, (buyerCount ?? 1) - 1) }).map(
        (_, index) => (
          <span
            key={index}
            className="absolute rounded-full border border-[var(--line)]"
            style={{
              inset: -(index + 1) * 7,
            }}
            aria-hidden="true"
          />
        ),
      )}

      <span className="font-display text-2xl leading-none">{ticker}</span>
      <span className="mt-2 font-mono text-xs">{formatCurrency(purchaseValue)}</span>
      <span className="mt-1 text-[0.625rem] uppercase tracking-[0.12em] text-[var(--ink-soft)]">
        Conviction {formatScore(conviction)}
      </span>
    </motion.button>
  );
}
