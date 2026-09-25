// tests/unit/lib/csv.test.ts
import { describe, expect, it } from "vitest";

import { escapeCsvField, serializeCsv } from "@/lib/csv";

describe("escapeCsvField", () => {
  it("leaves plain values unquoted", () => {
    expect(escapeCsvField("acme")).toBe("acme");
    expect(escapeCsvField(160)).toBe("160");
    expect(escapeCsvField(2.5)).toBe("2.5");
    expect(escapeCsvField(true)).toBe("true");
    expect(escapeCsvField(false)).toBe("false");
  });

  it("treats null and undefined as empty", () => {
    expect(escapeCsvField(null)).toBe("");
    expect(escapeCsvField(undefined)).toBe("");
  });

  it("quotes comma", () => {
    expect(escapeCsvField("Acme, Inc")).toBe('"Acme, Inc"');
  });

  it("escapes quotes by doubling", () => {
    expect(escapeCsvField('He said "hi"')).toBe('"He said ""hi"""');
  });

  it("quotes newline and carriage return", () => {
    expect(escapeCsvField("line1\nline2")).toBe('"line1\nline2"');
    expect(escapeCsvField("line1\r\nline2")).toBe('"line1\r\nline2"');
  });

  it("preserves UTF-8 characters", () => {
    expect(escapeCsvField("Caffè Società")).toBe("Caffè Società");
  });
});

describe("serializeCsv", () => {
  it("joins fields with commas and rows with LF, then a final newline", () => {
    expect(
      serializeCsv([
        ["metric", "currency"],
        ["accrued", "EUR"],
      ]),
    ).toBe("metric,currency\naccrued,EUR\n");
  });

  it("is deterministic for the same rows", () => {
    const rows = [
      ["a", "b"],
      ["c", "d"],
    ] as const;
    expect(serializeCsv(rows)).toBe(serializeCsv(rows));
  });

  it("serializes an empty field row as a blank line", () => {
    expect(serializeCsv([["a"], [], ["b"]])).toBe("a\n\nb\n");
  });

  it("escapes mixed special characters in a full document", () => {
    const csv = serializeCsv([
      ["name", "note"],
      ["Acme, Inc", 'Say "go"\nnow'],
    ]);
    expect(csv).toBe('name,note\n"Acme, Inc","Say ""go""\nnow"\n');
  });
});
