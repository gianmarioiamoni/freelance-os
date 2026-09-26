// tests/unit/application/ai/provider-period-schema.test.ts
import { describe, expect, it } from "vitest";

import {
  acceptsProviderArgumentSchema,
  providerArgumentSchema,
} from "@/application/ai/provider-period-schema";
import { AI_PERIOD_KINDS } from "@/application/ai/resolve-ai-period";

const PERIOD_KEYS = ["periodKind", "startDate", "endDate", "clientId"] as const;

describe("providerArgumentSchema", () => {
  it("serializes application period kinds and rejects current", () => {
    const schema = providerArgumentSchema(PERIOD_KEYS);

    expect(schema.properties.periodKind?.type).toBe("string");
    expect(schema.properties.periodKind?.enum).toEqual(AI_PERIOD_KINDS);
    expect(schema.properties.periodKind?.enum).not.toContain("current");
    expect(schema).not.toHaveProperty("allOf");
    expect(schema.properties.startDate?.type).toBe("string");
    expect(schema.properties.startDate?.description).toMatch(/custom/);
    expect(schema.properties.clientId).toEqual({ type: "string" });
  });

  it("accepts each application period kind", () => {
    const schema = providerArgumentSchema(PERIOD_KEYS);

    expect(acceptsProviderArgumentSchema(schema, { periodKind: "today" })).toBe(true);
    expect(acceptsProviderArgumentSchema(schema, { periodKind: "week" })).toBe(true);
    expect(acceptsProviderArgumentSchema(schema, { periodKind: "month" })).toBe(true);
    expect(acceptsProviderArgumentSchema(schema, { periodKind: "year" })).toBe(true);
    expect(
      acceptsProviderArgumentSchema(schema, {
        periodKind: "custom",
        startDate: "2025-01-01",
        endDate: "2025-01-31",
      }),
    ).toBe(true);
    expect(acceptsProviderArgumentSchema(schema, {})).toBe(true);
  });

  it("does not accept current or custom without dates", () => {
    const schema = providerArgumentSchema(PERIOD_KEYS);

    expect(acceptsProviderArgumentSchema(schema, { periodKind: "current" })).toBe(false);
    expect(acceptsProviderArgumentSchema(schema, { periodKind: "custom" })).toBe(false);
    expect(
      acceptsProviderArgumentSchema(schema, {
        periodKind: "custom",
        startDate: "2025-01-01",
      }),
    ).toBe(false);
    expect(
      acceptsProviderArgumentSchema(schema, {
        periodKind: "month",
        startDate: "2025-01-01",
        endDate: "2025-01-31",
      }),
    ).toBe(false);
  });
});
