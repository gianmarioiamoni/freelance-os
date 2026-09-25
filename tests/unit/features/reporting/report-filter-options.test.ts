// tests/unit/features/reporting/report-filter-options.test.ts
import { describe, expect, it } from "vitest";

import { toReportFilterOptions } from "@/features/reporting/report-filter-options";

describe("toReportFilterOptions", () => {
  it("labels clients by company name and contracts by client + validity", () => {
    const options = toReportFilterOptions(
      [{ id: "client-1", companyName: "Acme" }],
      [
        {
          id: "contract-1",
          clientId: "client-1",
          validFrom: new Date("2026-01-01T00:00:00.000Z"),
          validTo: new Date("2026-12-31T00:00:00.000Z"),
        },
      ],
    );

    expect(options.clients).toEqual([{ id: "client-1", label: "Acme" }]);
    expect(options.contracts).toEqual([
      { id: "contract-1", label: "Acme · 2026-01-01 → 2026-12-31" },
    ]);
  });

  it("uses a fallback label when the contract client is missing", () => {
    const options = toReportFilterOptions(
      [],
      [
        {
          id: "contract-1",
          clientId: "missing",
          validFrom: new Date("2026-01-01T00:00:00.000Z"),
          validTo: null,
        },
      ],
    );

    expect(options.contracts[0]?.label).toBe(
      "Client unavailable · 2026-01-01 → Open-ended",
    );
  });
});
