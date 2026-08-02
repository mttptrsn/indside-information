"use client";

import { motion, useReducedMotion } from "framer-motion";
import { formatScore } from "@/lib/format";

export function ConvictionDial({
  score,
  label = "Conviction",
  detail,
}: {
  score?: number | null;
  label?: string;
  detail?: string;
}) {
  const reducedMotion = useReducedMotion();
  const value = Math.max(0, Math.min(100, score ?? 0));
  const radius = 82;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - value / 100);

  return (
    <figure className="relative mx-auto aspect-square w-full max-w-[20rem]">
      <svg
        viewBox="0 0 220 220"
        className="-rotate-90 overflow-visible"
        role="img"
        aria-label={`${label}: ${formatScore(score)} out of 100`}
      >
        <circle
          cx="110"
          cy="110"
          r={radius}
          fill="none"
          stroke="var(--line)"
          strokeWidth="1"
        />
        {[0, 25, 50, 75].map((tick) => {
          const angle = (tick / 100) * Math.PI * 2;
          const x1 = 110 + Math.cos(angle) * 91;
          const y1 = 110 + Math.sin(angle) * 91;
          const x2 = 110 + Math.cos(angle) * 98;
          const y2 = 110 + Math.sin(angle) * 98;
          return (
            <line
              key={tick}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="var(--line-strong)"
              strokeWidth="1"
            />
          );
        })}
        <motion.circle
          cx="110"
          cy="110"
          r={radius}
          fill="none"
          stroke="var(--accent)"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={
            reducedMotion
              ? undefined
              : { strokeDashoffset: circumference }
          }
          whileInView={{ strokeDashoffset: offset }}
          viewport={{ once: true, amount: 0.55 }}
          transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
        />
      </svg>
      <figcaption className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="eyebrow">{label}</span>
        <span className="signal-number mt-3 text-7xl leading-none">
          {formatScore(score)}
        </span>
        {detail ? (
          <span className="mt-4 max-w-36 text-xs leading-5 text-[var(--ink-muted)]">
            {detail}
          </span>
        ) : null}
      </figcaption>
    </figure>
  );
}
