"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useMemo, useState } from "react";
import { formatCurrency, formatDate, formatScore } from "@/lib/format";
import { scale } from "@/lib/visual";
import type { DailyActivityData } from "@/types/home";

export function ActivityPulse({
  activity,
}: {
  activity: DailyActivityData;
}) {
  const reducedMotion = useReducedMotion();
  const [selectedDate, setSelectedDate] = useState("");
  const days = useMemo(() => [...activity.days].slice(-90), [activity.days]);
  const maxValue = Math.max(...days.map((day) => day.purchase_value ?? 0), 1);
  const selected =
    days.find((day) => day.date === selectedDate) ?? days[days.length - 1];

  return (
    <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_18rem]">
      <div className="flex h-72 items-end gap-1 border-b border-[var(--line-strong)] px-2">
        {days.map((day, index) => {
          const height = scale(day.purchase_value ?? 0, 0, maxValue, 8, 250);
          const active = selected?.date === day.date;
          return (
            <motion.button
              key={day.date}
              type="button"
              aria-label={`${formatDate(day.date)}, ${formatCurrency(
                day.purchase_value,
              )}`}
              className="relative min-w-0 flex-1 bg-[var(--ink)]"
              style={{
                height,
                opacity: active ? 1 : 0.18 + (day.median_conviction ?? 0) / 150,
              }}
              initial={reducedMotion ? false : { scaleY: 0 }}
              animate={{ scaleY: 1 }}
              transition={{
                duration: 0.65,
                delay: reducedMotion ? 0 : Math.min(index, 40) * 0.012,
                ease: [0.16, 1, 0.3, 1],
              }}
              onMouseEnter={() => setSelectedDate(day.date)}
              onFocus={() => setSelectedDate(day.date)}
              onClick={() => setSelectedDate(day.date)}
            />
          );
        })}
      </div>

      {selected ? (
        <aside className="border-t border-[var(--line-strong)] pt-5">
          <p className="eyebrow">{formatDate(selected.date)}</p>
          <p className="mt-5 font-display text-5xl leading-none">
            {formatCurrency(selected.purchase_value)}
          </p>
          <dl className="mt-8 space-y-4">
            <Fact label="Purchase events" value={String(selected.event_count)} />
            <Fact label="Independent buyers" value={String(selected.buyer_count)} />
            <Fact
              label="Typical evidence strength"
              value={formatScore(selected.median_conviction)}
            />
          </dl>
        </aside>
      ) : null}
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-[var(--line)] pb-3">
      <dt className="text-sm text-[var(--ink-muted)]">{label}</dt>
      <dd className="font-mono text-sm">{value}</dd>
    </div>
  );
}
