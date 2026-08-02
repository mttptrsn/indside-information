import { formatDate, formatNumber } from "@/lib/format";
import type { StatusData } from "@/types/interior";

function normalizeDate(value: unknown): string {
  const raw = String(value ?? "").trim();

  if (
    !raw ||
    ["none", "null", "nan", "undefined"].includes(
      raw.toLowerCase(),
    )
  ) {
    return "";
  }

  const compact = raw.match(
    /^(\d{4})(\d{2})(\d{2})$/,
  );

  if (compact) {
    const [, year, month, day] = compact;
    return `${year}-${month}-${day}`;
  }

  return raw;
}

function displayDate(value: unknown): string {
  const normalized = normalizeDate(value);

  return normalized
    ? formatDate(normalized)
    : "Unavailable";
}

function normalizedStatus(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

export function StatusReport({
  data,
}: {
  data: StatusData;
}) {
  const overallStatus = normalizedStatus(
    data.pipeline?.overall_status,
  );

  const healthy =
    overallStatus === "complete" ||
    overallStatus === "success" ||
    overallStatus === "healthy";

  const stages = Object.entries(
    data.pipeline?.stage_statuses ?? {},
  );

  const counts = Object.entries(
    data.source_counts ?? {},
  );

  return (
    <article>
      <header className="editorial-container py-12 md:py-16">
        <p className="eyebrow">
          Status
        </p>

        <h1 className="mt-5 font-display text-6xl leading-[0.9] tracking-[-0.06em] md:text-8xl">
          {healthy
            ? "The evidence is current."
            : "The evidence needs attention."}
        </h1>
      </header>

      <section className="section-space border-y border-[var(--line)] bg-[var(--surface)]">
        <div className="editorial-container">
          <div className="grid gap-5 sm:grid-cols-3">
            <Stat
              value={displayDate(
                data.freshness
                  ?.latest_sec_filing_date,
              )}
              label="latest SEC filing"
            />

            <Stat
              value={displayDate(
                data.freshness
                  ?.latest_price_date,
              )}
              label="latest price"
            />

            <Stat
              value={displayDate(
                data.freshness
                  ?.exported_at_utc,
              )}
              label="latest export"
            />
          </div>

          {stages.length ? (
            <div className="mt-14 flex flex-wrap gap-2">
              {stages.map(
                ([stage, status]) => (
                  <span
                    key={stage}
                    className="border border-[var(--line)] px-3 py-2 text-sm"
                  >
                    {stage.replaceAll(
                      "_",
                      " ",
                    )}{" "}
                    · {String(status)}
                  </span>
                ),
              )}
            </div>
          ) : null}

          <div className="mt-14 grid gap-5 sm:grid-cols-3">
            {counts
              .slice(0, 6)
              .map(
                ([label, value]) => (
                  <Stat
                    key={label}
                    value={formatNumber(
                      Number(value),
                    )}
                    label={label.replaceAll(
                      "_",
                      " ",
                    )}
                  />
                ),
              )}
          </div>
        </div>
      </section>
    </article>
  );
}

function Stat({
  value,
  label,
}: {
  value: string;
  label: string;
}) {
  return (
    <div className="border-t border-[var(--line-strong)] pt-4">
      <p className="font-display text-4xl leading-none">
        {value}
      </p>

      <p className="mt-3 text-sm text-[var(--ink-muted)]">
        {label}
      </p>
    </div>
  );
}
