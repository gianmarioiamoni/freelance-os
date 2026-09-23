// tests/unit/features/time-entries/eligible-contracts.test.ts
import { describe, expect, it } from "vitest";

import { filterEligibleContracts } from "@/features/time-entries/eligible-contracts";
import type { ContractRecord } from "@/domain/persistence-types";

function utcDate(ymd: string): Date {
  return new Date(`${ymd}T00:00:00.000Z`);
}

function contractRecord(overrides: Partial<ContractRecord> = {}): ContractRecord {
  return {
    id: "contract-a",
    workspaceId: "workspace-a",
    clientId: "client-a",
    validFrom: utcDate("2026-10-01"),
    validTo: null,
    billingModel: "HOURLY",
    rate: "100.00",
    currency: "EUR",
    monthlyContractedMinutes: 9600,
    allocatedMinutes: null,
    paymentTermsDays: 30,
    paymentTermsNote: null,
    createdAt: utcDate("2026-01-01"),
    updatedAt: utcDate("2026-01-01"),
    ...overrides,
  };
}

const FUTURE = contractRecord();
const BOUNDED = contractRecord({
  id: "contract-bounded",
  validFrom: utcDate("2026-09-20"),
  validTo: utcDate("2026-10-01"),
});
const CLIENT_B = contractRecord({
  id: "contract-b",
  clientId: "client-b",
  validFrom: utcDate("2026-09-20"),
});

const CATALOG = [FUTURE, BOUNDED, CLIENT_B];

describe("filterEligibleContracts — FINDING-110-P06-002", () => {
  it("hides a future-start contract on today, shows it on validFrom, hides it again before validFrom", () => {
    const clientId = "client-a";
    let workDate = "2026-09-20";

    expect(filterEligibleContracts([FUTURE], clientId, workDate).map((c) => c.id)).toEqual(
      [],
    );

    workDate = "2026-10-01";
    expect(filterEligibleContracts([FUTURE], clientId, workDate).map((c) => c.id)).toEqual([
      "contract-a",
    ]);

    workDate = "2026-09-30";
    expect(filterEligibleContracts([FUTURE], clientId, workDate).map((c) => c.id)).toEqual(
      [],
    );
  });

  it("keeps [validFrom, validTo): inside is visible, validTo is hidden", () => {
    const clientId = "client-a";

    expect(
      filterEligibleContracts(CATALOG, clientId, "2026-09-20").map((c) => c.id),
    ).toEqual(["contract-bounded"]);
    expect(
      filterEligibleContracts(CATALOG, clientId, "2026-09-30").map((c) => c.id),
    ).toEqual(["contract-bounded"]);
    expect(
      filterEligibleContracts(CATALOG, clientId, "2026-10-01").map((c) => c.id),
    ).toEqual(["contract-a"]);
  });

  it("recalculates when the client changes and shows nothing with no client", () => {
    const workDate = "2026-09-20";

    expect(filterEligibleContracts(CATALOG, "", workDate)).toEqual([]);
    expect(
      filterEligibleContracts(CATALOG, "client-a", workDate).map((c) => c.id),
    ).toEqual(["contract-bounded"]);
    expect(
      filterEligibleContracts(CATALOG, "client-b", workDate).map((c) => c.id),
    ).toEqual(["contract-b"]);
  });

  it("changing workDate while the client stays selected updates the eligible set", () => {
    const clientId = "client-a";

    expect(
      filterEligibleContracts(CATALOG, clientId, "2026-09-20").map((c) => c.id),
    ).toEqual(["contract-bounded"]);
    expect(
      filterEligibleContracts(CATALOG, clientId, "2026-10-01").map((c) => c.id),
    ).toEqual(["contract-a"]);
  });

  it("parses YYYY-MM-DD as UTC midnight, not local calendar", () => {
    const westOfUtc = contractRecord({
      validFrom: utcDate("2026-10-01"),
    });

    expect(
      filterEligibleContracts([westOfUtc], "client-a", "2026-09-30"),
    ).toHaveLength(0);
    expect(
      filterEligibleContracts([westOfUtc], "client-a", "2026-10-01"),
    ).toHaveLength(1);
  });
});
