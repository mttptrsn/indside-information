const COMPACT_SUFFIXES = [
  { threshold: 1_000_000_000_000, divisor: 1_000_000_000_000, suffix: "T" },
  { threshold: 1_000_000_000, divisor: 1_000_000_000, suffix: "B" },
  { threshold: 1_000_000, divisor: 1_000_000, suffix: "M" },
  { threshold: 1_000, divisor: 1_000, suffix: "K" },
] as const;

function isFiniteNumber(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function trimTrailingZero(value: string): string {
  return value.endsWith(".0") ? value.slice(0, -2) : value;
}

function groupInteger(value: number): string {
  const sign = value < 0 ? "-" : "";
  const digits = Math.abs(Math.trunc(value)).toString();
  return `${sign}${digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
}

function formatCompactValue(value: number): string {
  const absoluteValue = Math.abs(value);

  for (const unit of COMPACT_SUFFIXES) {
    if (absoluteValue >= unit.threshold) {
      const scaled = value / unit.divisor;
      const decimals = Math.abs(scaled) < 10 ? 1 : 0;
      return `${trimTrailingZero(scaled.toFixed(decimals))}${unit.suffix}`;
    }
  }

  if (Number.isInteger(value)) {
    return groupInteger(value);
  }

  return trimTrailingZero(value.toFixed(1));
}

export function formatCurrency(value?: number | null): string {
  if (!isFiniteNumber(value)) {
    return "Not available";
  }

  const sign = value < 0 ? "-" : "";
  return `${sign}$${formatCompactValue(Math.abs(value))}`;
}

export function formatNumber(value?: number | null): string {
  if (!isFiniteNumber(value)) {
    return "0";
  }

  return formatCompactValue(value);
}

export function formatPercent(value?: number | null): string {
  if (!isFiniteNumber(value)) {
    return "Not available";
  }

  return `${trimTrailingZero(value.toFixed(1))}%`;
}

export function formatScore(value?: number | null): string {
  if (!isFiniteNumber(value)) {
    return "—";
  }

  return Math.round(value).toString();
}

export function formatMultiple(value?: number | null): string {
  if (!isFiniteNumber(value) || value <= 0) {
    return "First recorded purchase";
  }

  const decimals = value >= 10 ? 1 : 2;
  return `${trimTrailingZero(value.toFixed(decimals))}×`;
}

function utcDateParts(value: string): {
  year: number;
  month: number;
  day: number;
} | null {
  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return {
    year: parsed.getUTCFullYear(),
    month: parsed.getUTCMonth(),
    day: parsed.getUTCDate(),
  };
}

const MONTHS_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

const MONTHS_LONG = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

export function formatDate(
  value?: string | null,
  options?: Intl.DateTimeFormatOptions,
): string {
  if (!value) {
    return "Date unavailable";
  }

  const parts = utcDateParts(value);

  if (!parts) {
    return value;
  }

  const monthStyle = options?.month ?? "short";
  const includeDay = options?.day !== undefined || options === undefined;
  const includeYear = options?.year !== undefined || options === undefined;

  const month =
    monthStyle === "long"
      ? MONTHS_LONG[parts.month]
      : monthStyle === "numeric"
        ? String(parts.month + 1)
        : monthStyle === "2-digit"
          ? String(parts.month + 1).padStart(2, "0")
          : MONTHS_SHORT[parts.month];

  const pieces = [month];

  if (includeDay) {
    pieces.push(String(parts.day));
  }

  let result = pieces.join(" ");

  if (includeYear) {
    result = `${result}, ${parts.year}`;
  }

  return result;
}

export function slugifyTicker(ticker?: string | null): string {
  return (ticker ?? "unknown")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function titleCaseCategory(value: string): string {
  return value
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}
