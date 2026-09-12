// tests/unit/components/app-shell/account-label.test.ts
import { getAccountDisplayLabel } from "@/components/app-shell/account-label";
import { describe, expect, it } from "vitest";

describe("getAccountDisplayLabel", () => {
  it("should prefer a trimmed name when present", () => {
    expect(getAccountDisplayLabel("Ada Lovelace", "ada@example.com")).toBe(
      "Ada Lovelace",
    );
    expect(getAccountDisplayLabel("  Ada  ", "ada@example.com")).toBe("Ada");
  });

  it("should fall back to email when the name is missing or blank", () => {
    expect(getAccountDisplayLabel(null, "ada@example.com")).toBe(
      "ada@example.com",
    );
    expect(getAccountDisplayLabel(undefined, "ada@example.com")).toBe(
      "ada@example.com",
    );
    expect(getAccountDisplayLabel("", "ada@example.com")).toBe(
      "ada@example.com",
    );
    expect(getAccountDisplayLabel("   ", "ada@example.com")).toBe(
      "ada@example.com",
    );
  });
});
