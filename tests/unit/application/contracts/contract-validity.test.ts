// tests/unit/application/contracts/contract-validity.test.ts
import { describe, expect, it } from "vitest";

import {
  assertValidContractPeriod,
  contractCoversDate,
  contractIntervalsOverlap,
  deriveContractApplicability,
  hasOverlappingContract,
} from "@/application/contracts/contract-validity";
import { InvalidContractPeriodError } from "@/domain/contract-errors";
import type { ContractRecord } from "@/domain/persistence-types";

function calendarDate(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

function contract(overrides: Partial<ContractRecord> = {}): ContractRecord {
  return {
    id: "contract-1",
    workspaceId: "workspace-1",
    clientId: "client-1",
    validFrom: calendarDate("2026-01-01"),
    validTo: calendarDate("2026-07-01"),
    billingModel: "HOURLY",
    rate: "80.0000",
    currency: "EUR",
    monthlyContractedMinutes: null,
    allocatedMinutes: null,
    paymentTermsDays: null,
    paymentTermsNote: null,
    createdAt: calendarDate("2026-01-01"),
    updatedAt: calendarDate("2026-01-01"),
    ...overrides,
  };
}

describe("contract validity helpers", () => {
  it("accepts a strict half-open period and open-ended validTo", () => {
    expect(() =>
      assertValidContractPeriod(
        calendarDate("2026-01-01"),
        calendarDate("2026-07-01"),
      ),
    ).not.toThrow();
    expect(() =>
      assertValidContractPeriod(calendarDate("2026-01-01"), null),
    ).not.toThrow();
  });

  it("rejects [D, D) and inverted ranges", () => {
    expect(() =>
      assertValidContractPeriod(
        calendarDate("2026-07-01"),
        calendarDate("2026-07-01"),
      ),
    ).toThrow(InvalidContractPeriodError);
    expect(() =>
      assertValidContractPeriod(
        calendarDate("2026-07-01"),
        calendarDate("2026-06-30"),
      ),
    ).toThrow(InvalidContractPeriodError);
  });

  it("accepts adjacent intervals and rejects overlapping intervals", () => {
    expect(
      contractIntervalsOverlap(
        calendarDate("2026-01-01"),
        calendarDate("2026-07-01"),
        calendarDate("2026-07-01"),
        null,
      ),
    ).toBe(false);
    expect(
      contractIntervalsOverlap(
        calendarDate("2026-01-01"),
        calendarDate("2026-07-01"),
        calendarDate("2026-06-15"),
        null,
      ),
    ).toBe(true);
  });

  it("includes validFrom and excludes validTo", () => {
    expect(
      contractCoversDate(
        calendarDate("2026-01-01"),
        calendarDate("2026-07-01"),
        calendarDate("2026-01-01"),
      ),
    ).toBe(true);
    expect(
      contractCoversDate(
        calendarDate("2026-01-01"),
        calendarDate("2026-07-01"),
        calendarDate("2026-06-30"),
      ),
    ).toBe(true);
    expect(
      contractCoversDate(
        calendarDate("2026-01-01"),
        calendarDate("2026-07-01"),
        calendarDate("2026-07-01"),
      ),
    ).toBe(false);
  });

  it("derives scheduled, current, and ended applicability", () => {
    expect(
      deriveContractApplicability(
        calendarDate("2026-07-01"),
        null,
        calendarDate("2026-06-30"),
      ),
    ).toBe("scheduled");
    expect(
      deriveContractApplicability(
        calendarDate("2026-01-01"),
        calendarDate("2026-07-01"),
        calendarDate("2026-06-30"),
      ),
    ).toBe("current");
    expect(
      deriveContractApplicability(
        calendarDate("2026-01-01"),
        calendarDate("2026-07-01"),
        calendarDate("2026-07-01"),
      ),
    ).toBe("ended");
  });

  it("excludes the edited contract from overlap detection", () => {
    const existing = [
      contract(),
      contract({
        id: "contract-2",
        validFrom: calendarDate("2026-07-01"),
        validTo: null,
      }),
    ];

    expect(
      hasOverlappingContract(
        existing,
        calendarDate("2026-01-01"),
        calendarDate("2026-08-01"),
        "contract-1",
      ),
    ).toBe(true);
    expect(
      hasOverlappingContract(
        existing,
        calendarDate("2026-01-01"),
        calendarDate("2026-07-01"),
        "contract-1",
      ),
    ).toBe(false);
  });
});
