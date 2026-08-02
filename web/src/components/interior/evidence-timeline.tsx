import { formatCurrency, formatDate, formatMultiple } from "@/lib/format";
import { numberValue, recordId, text } from "@/lib/record";

export function EvidenceTimeline({
  events,
  title = "Purchase timeline",
}: {
  events: Array<Record<string, unknown>>;
  title?: string;
}) {
  const sorted = [...events].sort((a, b) =>
    text(b, "transaction_date", "date").localeCompare(
      text(a, "transaction_date", "date"),
    ),
  );

  const maximum = Math.max(
    ...sorted.map(
      (event) =>
        numberValue(
          event,
          "purchase_value",
          "current_purchase_value",
          "total_reported_purchase_value",
          "reported_value",
        ) ?? 0,
    ),
    1,
  );

  return (
    <section>
      <div className="flex items-end justify-between gap-6">
        <div>
          <p className="eyebrow">Chronology</p>
          <h2 className="mt-5 font-display text-5xl tracking-[-0.04em] md:text-6xl">
            {title}
          </h2>
        </div>
        <p className="font-mono text-xs uppercase tracking-[0.12em] text-[var(--ink-soft)]">
          {sorted.length} recorded events
        </p>
      </div>

      <ol className="relative mt-14 border-y border-[var(--line)]">
        {sorted.map((event, index) => {
          const value =
            numberValue(
              event,
              "purchase_value",
              "current_purchase_value",
              "total_reported_purchase_value",
              "reported_value",
            ) ?? 0;
          const multiple = numberValue(
            event,
            "purchase_multiple",
            "value_multiple",
          );
          const width = Math.max(2, Math.sqrt(value / maximum) * 100);

          return (
            <li
              key={recordId(event, String(index))}
              className="group relative grid gap-5 border-b border-[var(--line)] py-7 last:border-b-0 md:grid-cols-12 md:items-center"
            >
              <span
                className="absolute inset-y-0 left-0 -z-10 bg-[color-mix(in_srgb,var(--accent)_6%,transparent)] transition-[width] duration-1000 ease-out"
                style={{ width: `${width}%` }}
                aria-hidden="true"
              />
              <time className="font-mono text-xs uppercase tracking-[0.12em] text-[var(--ink-soft)] md:col-span-2">
                {formatDate(text(event, "transaction_date", "date"))}
              </time>
              <div className="md:col-span-4">
                <p className="font-display text-3xl leading-none">
                  {text(event, "owner_name", "insider_name") ||
                    "Reporting owner"}
                </p>
                <p className="mt-3 text-sm text-[var(--ink-muted)]">
                  {text(
                    event,
                    "normalized_roles",
                    "raw_officer_title",
                    "history_depth",
                  ) || "Role not classified"}
                </p>
              </div>
              <div className="md:col-span-3">
                <p className="font-mono text-lg">
                  {formatCurrency(value)}
                </p>
                <p className="mt-2 text-xs uppercase tracking-[0.12em] text-[var(--ink-soft)]">
                  {formatMultiple(multiple)}
                </p>
              </div>
              <div className="md:col-span-3 md:text-right">
                <p className="text-sm text-[var(--ink-muted)]">
                  {text(
                    event,
                    "direct_indirect_code",
                    "ownership_type",
                    "history_quality",
                  ) || "Ownership unknown"}
                </p>
                <p className="mt-2 font-mono text-xs text-[var(--ink-soft)]">
                  {text(event, "source_accession", "accession_number")}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
