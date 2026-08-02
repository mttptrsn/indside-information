export function finite(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

export function safeText(value: unknown, fallback = ""): string {
  if (value === null || value === undefined) return fallback;
  const normalized = String(value).trim();
  if (!normalized) return fallback;
  const lowered = normalized.toLowerCase();
  if (["nan", "none", "null", "undefined"].includes(lowered)) return fallback;
  return normalized;
}

export function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

export function scale(
  value: number,
  domainMinimum: number,
  domainMaximum: number,
  rangeMinimum: number,
  rangeMaximum: number,
): number {
  if (!Number.isFinite(value)) return rangeMinimum;
  if (domainMaximum === domainMinimum) return (rangeMinimum + rangeMaximum) / 2;
  const ratio = (value - domainMinimum) / (domainMaximum - domainMinimum);
  return rangeMinimum + clamp(ratio, 0, 1) * (rangeMaximum - rangeMinimum);
}

export function logScale(
  value: number,
  domainMinimum: number,
  domainMaximum: number,
  rangeMinimum: number,
  rangeMaximum: number,
): number {
  const safeValue = Math.max(value, 1);
  const safeMin = Math.max(domainMinimum, 1);
  const safeMax = Math.max(domainMaximum, safeMin + 1);
  return scale(
    Math.log10(safeValue),
    Math.log10(safeMin),
    Math.log10(safeMax),
    rangeMinimum,
    rangeMaximum,
  );
}
