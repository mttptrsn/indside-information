import Link from "next/link";
import { slugifyTicker } from "@/lib/format";
import { text } from "@/lib/record";

type RelationshipSource = object;

interface RelationshipNodeData {
  key: string;
  label: string;
  detail: string;
  href: string;
}

function asRecord(
  value: RelationshipSource,
): Record<string, unknown> {
  return value as Record<string, unknown>;
}

function normalizeIdentifier(value: string): string {
  const normalized = value.trim().toLowerCase();

  if (
    !normalized ||
    normalized === "nan" ||
    normalized === "none" ||
    normalized === "null" ||
    normalized === "undefined"
  ) {
    return "";
  }

  return normalized;
}

function buildPersonNodes(
  people: RelationshipSource[],
): RelationshipNodeData[] {
  return people.slice(0, 5).map((source, index) => {
    const person = asRecord(source);
    const ownerCik = normalizeIdentifier(text(person, "owner_cik"));
    const insiderId = normalizeIdentifier(text(person, "insider_id"));
    const identifier = ownerCik || insiderId;

    const label =
      text(person, "owner_name", "display_name", "canonical_name") ||
      "Executive";

    const detail =
      text(person, "normalized_roles", "raw_officer_title") ||
      "Role unavailable";

    return {
      key: [
        "person",
        identifier || "unidentified",
        label.toLowerCase(),
        String(index),
      ].join(":"),
      label,
      detail,
      href: identifier ? `/insiders/${identifier}` : "",
    };
  });
}

function buildCompanyNodes(
  companies: RelationshipSource[],
): RelationshipNodeData[] {
  return companies.slice(0, 5).map((source, index) => {
    const company = asRecord(source);
    const ticker = text(
      company,
      "primary_ticker",
      "ticker",
      "yf_ticker",
    );
    const issuerCik = normalizeIdentifier(text(company, "issuer_cik"));
    const companyName =
      text(company, "company_name", "issuer_name") ||
      ticker ||
      "Company";
    const sector = text(company, "sector");
    const slug = ticker ? slugifyTicker(ticker) : "";

    return {
      key: [
        "company",
        issuerCik || slug || "unidentified",
        companyName.toLowerCase(),
        String(index),
      ].join(":"),
      label: companyName,
      detail:
        [ticker, sector].filter(Boolean).join(" · ") ||
        "Company relationship",
      href: slug ? `/companies/${slug}` : "",
    };
  });
}

export function RelationshipMap({
  center,
  people = [],
  companies = [],
}: {
  center: string;
  people?: RelationshipSource[];
  companies?: RelationshipSource[];
}) {
  const personNodes = buildPersonNodes(people);
  const companyNodes = buildCompanyNodes(companies);

  return (
    <section>
      <p className="eyebrow">Relationship map</p>

      <div className="relationship-map mt-10">
        <div className="space-y-3">
          {personNodes.map((node) => (
            <RelationshipNode
              key={node.key}
              label={node.label}
              detail={node.detail}
              href={node.href}
            />
          ))}
        </div>

        <div className="relationship-center">
          <span className="relationship-line relationship-line-left" />
          <span className="relationship-line relationship-line-right" />

          <div className="relative z-10 max-w-56 border border-[var(--line-strong)] bg-[var(--canvas)] px-7 py-10 text-center shadow-[var(--shadow-soft)]">
            <p className="font-display text-3xl leading-none">
              {center}
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {companyNodes.map((node) => (
            <RelationshipNode
              key={node.key}
              label={node.label}
              detail={node.detail}
              href={node.href}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function RelationshipNode({
  label,
  detail,
  href,
}: {
  label: string;
  detail: string;
  href: string;
}) {
  const content = (
    <div className="group border border-[var(--line)] bg-[var(--surface)] p-5 transition-[transform,border-color,background-color] duration-500 hover:-translate-y-0.5 hover:border-[var(--line-strong)] hover:bg-[var(--surface-raised)]">
      <p className="font-display text-2xl leading-none">
        {label}
      </p>

      <p className="mt-2 text-sm text-[var(--ink-muted)]">
        {detail}
      </p>
    </div>
  );

  return href ? <Link href={href}>{content}</Link> : content;
}
