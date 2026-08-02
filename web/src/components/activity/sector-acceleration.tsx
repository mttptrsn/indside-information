import { currency } from "@/lib/activity";
import type { SectorAccelerationItem } from "@/types/activity";

export function SectorAcceleration({
  items,
}: {
  items: SectorAccelerationItem[];
}) {
  const maximum = Math.max(
    ...items.map((item) => item.multiplier),
    1,
  );

  return (
    <div className="divide-y divide-[var(--line)] border-y border-[var(--line)]">
      {items.slice(0, 8).map((item) => (
        <div
          key={item.sector}
          className="grid gap-5 py-5 md:grid-cols-[12rem_minmax(0,1fr)_auto] md:items-center"
        >
          <div>
            <p className="font-display text-3xl leading-none">
              {item.sector}
            </p>

            <p className="mt-2 text-xs text-[var(--ink-muted)]">
              {item.companies} companies · {item.buyers} buyers
            </p>
          </div>

          <div>
            <div className="h-3 bg-[var(--line)]">
              <div
                className="h-full bg-[var(--ink)]"
                style={{
                  width: `${Math.max(
                    4,
                    (item.multiplier / maximum) * 100,
                  )}%`,
                }}
              />
            </div>

            <p className="mt-2 text-xs text-[var(--ink-soft)]">
              {item.currentPurchases} purchases now ·{" "}
              {item.previousPurchases} previously
            </p>
          </div>

          <div className="md:text-right">
            <p className="font-mono text-lg">
              {item.multiplier.toFixed(1)}×
            </p>

            <p className="mt-1 text-xs text-[var(--ink-muted)]">
              {currency(item.purchaseValue)}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
