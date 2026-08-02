export function text(
  record: Record<string, unknown> | null | undefined,
  ...keys: string[]
): string {
  for (const key of keys) {
    const value = record?.[key];
    if (value === null || value === undefined) continue;
    const normalized = String(value).trim();
    if (normalized && normalized.toLowerCase() !== "nan") return normalized;
  }
  return "";
}

export function numberValue(
  record: Record<string, unknown> | null | undefined,
  ...keys: string[]
): number | null {
  for (const key of keys) {
    const value = record?.[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim()) {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return null;
}

export function booleanValue(
  record: Record<string, unknown> | null | undefined,
  ...keys: string[]
): boolean {
  const value = keys.map((key) => record?.[key]).find((candidate) => candidate !== undefined);
  if (typeof value === "boolean") return value;
  return ["true", "1", "yes", "y"].includes(String(value ?? "").toLowerCase());
}

export function tokens(
  record: Record<string, unknown> | null | undefined,
  ...keys: string[]
): string[] {
  const value = keys.map((key) => record?.[key]).find((candidate) => candidate !== undefined);
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (!value) return [];
  const raw = String(value).trim();
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean);
  } catch {
    // Delimited strings are expected in legacy artifacts.
  }
  return raw.split(raw.includes("|") ? "|" : ",").map((item) => item.trim()).filter(Boolean);
}

export function recordId(
  record: Record<string, unknown>,
  fallback: string,
): string {
  return text(
    record,
    "event_id",
    "transaction_id",
    "campaign_id",
    "history_id",
    "accession_number",
  ) || fallback;
}
