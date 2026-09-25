// src/lib/csv.ts

export type CsvValue = string | number | boolean | null | undefined;

/**
 * RFC 4180-style field escaping.
 * Null/undefined become empty. Fields with comma, quote, or newline are quoted.
 */
export function escapeCsvField(value: CsvValue): string {
  if (value === null || value === undefined) {
    return "";
  }

  const raw = typeof value === "string" ? value : String(value);
  if (!/[",\n\r]/.test(raw)) {
    return raw;
  }

  return `"${raw.replace(/"/g, '""')}"`;
}

/**
 * Serializes rows as UTF-8 CSV text.
 * Line endings are LF. The document always ends with a final newline.
 */
export function serializeCsv(rows: readonly (readonly CsvValue[])[]): string {
  const lines = rows.map((row) => row.map(escapeCsvField).join(","));
  return `${lines.join("\n")}\n`;
}
