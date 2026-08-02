import { ExternalLink } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/format";
import { numberValue, recordId, text, tokens } from "@/lib/record";

function secUrl(record: Record<string, unknown>): string | null {
  const accession = text(record, "source_accession", "accession_number");
  const cik = text(record, "issuer_cik").replace(/^0+/, "");
  if (!accession || !cik) return null;
  const compact = accession.replaceAll("-", "");
  return `https://www.sec.gov/Archives/edgar/data/${cik}/${compact}/${accession}-index.html`;
}

export function FilingEvidence({
  transactions,
}: {
  transactions: Array<Record<string, unknown>>;
}) {
  return (
    <section>
      <p className="eyebrow">Supporting filings</p>
      <h2 className="mt-5 font-display text-5xl tracking-[-0.04em] md:text-6xl">
        The source record.
      </h2>
      <div className="mt-12 overflow-x-auto border-y border-[var(--line)]">
        <table className="w-full min-w-[760px] border-collapse text-left">
          <thead>
            <tr className="border-b border-[var(--line)]">
              {["Date", "Executive", "Shares", "Price", "Reported value", "Evidence"].map(
                (label) => (
                  <th
                    key={label}
                    className="py-4 pr-8 font-mono text-[0.6875rem] font-normal uppercase tracking-[0.13em] text-[var(--ink-soft)]"
                  >
                    {label}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {transactions.slice(0, 100).map((transaction, index) => {
              const url = secUrl(transaction);
              return (
                <tr
                  key={recordId(transaction, String(index))}
                  className="border-b border-[var(--line)] last:border-b-0"
                >
                  <td className="py-5 pr-8 text-sm">
                    {formatDate(text(transaction, "transaction_date"))}
                  </td>
                  <td className="py-5 pr-8">
                    <p>{text(transaction, "owner_name") || "Reporting owner"}</p>
                    <p className="mt-1 text-xs text-[var(--ink-muted)]">
                      {tokens(transaction, "normalized_roles").join(" · ")}
                    </p>
                  </td>
                  <td className="py-5 pr-8 font-mono text-sm">
                    {numberValue(transaction, "shares")?.toLocaleString("en-US") ?? "—"}
                  </td>
                  <td className="py-5 pr-8 font-mono text-sm">
                    {formatCurrency(numberValue(transaction, "price_per_share"))}
                  </td>
                  <td className="py-5 pr-8 font-mono text-sm">
                    {formatCurrency(
                      numberValue(transaction, "reported_value", "purchase_value"),
                    )}
                  </td>
                  <td className="py-5 pr-8">
                    {url ? (
                      <a
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 text-sm underline decoration-[var(--line-strong)] underline-offset-4"
                      >
                        SEC filing
                        <ExternalLink className="size-3.5" />
                      </a>
                    ) : (
                      <span className="text-sm text-[var(--ink-soft)]">
                        Accession unavailable
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
