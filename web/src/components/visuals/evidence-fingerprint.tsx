"use client";

import { motion, useReducedMotion } from "framer-motion";
import { formatScore } from "@/lib/format";

const DIMENSIONS = [
  ["Purchase size", "purchase"],
  ["Behavior change", "behavior"],
  ["Ownership impact", "ownership"],
  ["Confirmation", "cluster"],
] as const;

export function EvidenceFingerprint({
  conviction,
  purchase,
  behavior,
  ownership,
  cluster,
}: {
  conviction?: number | null;
  purchase?: number | null;
  behavior?: number | null;
  ownership?: number | null;
  cluster?: number | null;
}) {
  const reducedMotion = useReducedMotion();
  const values = {
    purchase: Math.max(0, Math.min(100, purchase ?? 0)),
    behavior: Math.max(0, Math.min(100, behavior ?? 0)),
    ownership: Math.max(0, Math.min(100, ownership ?? 0)),
    cluster: Math.max(0, Math.min(100, cluster ?? 0)),
  };

  return (
    <figure className="mx-auto w-full max-w-[34rem]">
      <div className="relative aspect-square">
        <div className="absolute inset-1/2 z-20 flex size-32 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full border border-[var(--line-strong)] bg-[var(--canvas)] shadow-[var(--shadow-soft)]">
          <span className="eyebrow">Conviction</span>
          <span className="signal-number mt-2 text-6xl">
            {formatScore(conviction)}
          </span>
        </div>

        {DIMENSIONS.map(([label, key], index) => {
          const angle = index * 90;
          const value = values[key];
          return (
            <motion.div
              key={key}
              className="absolute left-1/2 top-1/2 h-1 origin-left bg-[var(--line)]"
              style={{
                width: "42%",
                rotate: angle,
              }}
            >
              <motion.div
                className="h-full origin-left bg-[var(--accent)]"
                initial={reducedMotion ? false : { scaleX: 0 }}
                whileInView={{ scaleX: value / 100 }}
                viewport={{ once: true, amount: 0.6 }}
                transition={{
                  duration: 1.1,
                  delay: index * 0.08,
                  ease: [0.16, 1, 0.3, 1],
                }}
              />
              <div
                className="absolute top-1/2 flex -translate-y-1/2 items-center gap-3"
                style={{
                  left: "calc(100% + 1rem)",
                  transform: `translateY(-50%) rotate(${-angle}deg)`,
                }}
              >
                <span className="size-2 rounded-full bg-[var(--accent)]" />
                <span className="whitespace-nowrap text-xs uppercase tracking-[0.12em] text-[var(--ink-muted)]">
                  {label} {Math.round(value)}
                </span>
              </div>
            </motion.div>
          );
        })}

        <div className="absolute inset-[12%] rounded-full border border-[var(--line)]" />
        <div className="absolute inset-[28%] rounded-full border border-[var(--line)]" />
      </div>
    </figure>
  );
}
