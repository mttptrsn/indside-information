import { formatCurrency, formatMultiple, formatPercent, formatScore } from "@/lib/format";
import { numberValue, text } from "@/lib/record";

export function companyHeadline(
  signal?: Record<string, unknown> | null,
  fallbackCompany?: string,
): string {
  const explicit = text(signal, "headline");
  if (explicit) return explicit;

  const buyers = numberValue(signal, "buyer_count");
  if (buyers && buyers > 1) {
    return `${Math.round(buyers)} executives bought shares in the same company.`;
  }

  const multiple = numberValue(signal, "purchase_multiple");
  if (multiple && multiple > 1) {
    return `An executive made a purchase ${formatMultiple(multiple)} larger than usual.`;
  }

  return fallbackCompany
    ? `Executives at ${fallbackCompany} committed personal capital.`
    : "Executives committed personal capital.";
}

export function whyItMatters(signal?: Record<string, unknown> | null): string {
  const conviction = numberValue(signal, "conviction_score", "score");
  const buyers = numberValue(signal, "buyer_count");
  const ownership = numberValue(signal, "ownership_increase_percent");
  const value = numberValue(signal, "purchase_value");

  if (buyers && buyers >= 3) {
    return `${Math.round(buyers)} independent buyers reached the same decision, which makes the activity harder to dismiss as an isolated trade.`;
  }

  if (ownership && ownership >= 20) {
    return `The purchase materially increased the insider’s ownership by ${formatPercent(ownership)}, creating a meaningfully larger personal exposure.`;
  }

  if (value && value >= 1_000_000) {
    return `The reported purchase exceeded ${formatCurrency(value)}, making it a substantial personal commitment rather than a token transaction.`;
  }

  if (conviction && conviction >= 80) {
    return `The evidence remains strong after accounting for history, ownership, role relevance, confirmation, and data quality.`;
  }

  return "The purchase becomes more meaningful when viewed against the executive’s prior behavior and current ownership.";
}

export function whyItIsUnusual(signal?: Record<string, unknown> | null): string {
  const multiple = numberValue(signal, "purchase_multiple");
  const days = numberValue(signal, "days_since_previous_purchase");
  const behavior = numberValue(signal, "behavior_change_score");
  const priorCount = numberValue(signal, "prior_purchase_count");

  if (priorCount === 0) {
    return "This is the first recorded qualifying open-market purchase in the available history.";
  }

  if (days && days >= 365 * 3) {
    return `The executive returned after roughly ${(days / 365).toFixed(1)} years without a comparable purchase.`;
  }

  if (multiple && multiple >= 3) {
    return `The purchase was ${formatMultiple(multiple)} the executive’s prior median purchase size.`;
  }

  if (behavior && behavior >= 75) {
    return `The executive’s current behavior differs sharply from their own historical pattern, with a behavior-change score of ${formatScore(behavior)}.`;
  }

  return "The timing, size, or ownership impact differs from the executive’s established pattern.";
}

export function evidenceSummary(signal?: Record<string, unknown> | null): string[] {
  const evidence: string[] = [];

  const value = numberValue(signal, "purchase_value");
  const buyers = numberValue(signal, "buyer_count");
  const multiple = numberValue(signal, "purchase_multiple");
  const ownership = numberValue(signal, "ownership_increase_percent");
  const conviction = numberValue(signal, "conviction_score", "score");

  if (value) evidence.push(`${formatCurrency(value)} reported purchase`);
  if (multiple) evidence.push(`${formatMultiple(multiple)} prior median`);
  if (ownership) evidence.push(`${formatPercent(ownership)} ownership increase`);
  if (buyers) evidence.push(`${Math.round(buyers)} independent buyer${buyers === 1 ? "" : "s"}`);
  if (conviction) evidence.push(`Evidence strength ${formatScore(conviction)}`);

  return evidence.slice(0, 4);
}
