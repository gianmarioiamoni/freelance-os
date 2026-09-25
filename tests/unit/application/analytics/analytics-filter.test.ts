// tests/unit/application/analytics/analytics-filter.test.ts
import { describe, expect, it } from "vitest";

import { normalizeAnalyticsFilter } from "@/application/analytics/analytics-filter";

describe("normalizeAnalyticsFilter", () => {
  it("returns undefined when filter is absent", () => {
    expect(normalizeAnalyticsFilter()).toBeUndefined();
    expect(normalizeAnalyticsFilter({})).toBeUndefined();
  });

  it("treats empty and whitespace IDs as unset", () => {
    expect(
      normalizeAnalyticsFilter({ clientId: "", contractId: "   " }),
    ).toBeUndefined();
  });

  it("keeps Client only", () => {
    expect(normalizeAnalyticsFilter({ clientId: "client-1" })).toEqual({
      clientId: "client-1",
    });
  });

  it("keeps Contract only", () => {
    expect(normalizeAnalyticsFilter({ contractId: "contract-1" })).toEqual({
      contractId: "contract-1",
    });
  });

  it("keeps both filters after trim", () => {
    expect(
      normalizeAnalyticsFilter({
        clientId: " client-1 ",
        contractId: "contract-1",
      }),
    ).toEqual({
      clientId: "client-1",
      contractId: "contract-1",
    });
  });
});
