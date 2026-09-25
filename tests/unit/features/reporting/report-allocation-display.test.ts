// tests/unit/features/reporting/report-allocation-display.test.ts
import { describe, expect, it } from "vitest";

import type { ContractAllocation } from "@/domain/analytics-types";
import { reportAllocationDisplay } from "@/features/reporting/report-allocation-display";

const base: ContractAllocation = {
  contractId: "ct1",
  allocatedMinutes: 1000,
  consumedMinutes: 200,
  remainingMinutes: 800,
  allocationStatus: "NORMAL",
};

describe("reportAllocationDisplay", () => {
  it("shows em dashes and no status when allocation is absent", () => {
    expect(reportAllocationDisplay(undefined)).toEqual({
      allocatedLabel: "—",
      consumedLabel: "—",
      remainingLabel: "—",
      statusLabel: null,
      statusTone: null,
    });
  });

  it("shows em dashes and no status when allocatedMinutes is null", () => {
    expect(
      reportAllocationDisplay({
        ...base,
        allocatedMinutes: null,
        remainingMinutes: null,
        allocationStatus: null,
      }),
    ).toEqual({
      allocatedLabel: "—",
      consumedLabel: "—",
      remainingLabel: "—",
      statusLabel: null,
      statusTone: null,
    });
  });

  it("shows values and no status when allocatedMinutes is 0", () => {
    expect(
      reportAllocationDisplay({
        ...base,
        allocatedMinutes: 0,
        consumedMinutes: 60,
        remainingMinutes: 0,
        allocationStatus: null,
      }),
    ).toEqual({
      allocatedLabel: "0h",
      consumedLabel: "1h",
      remainingLabel: "0h",
      statusLabel: null,
      statusTone: null,
    });
  });

  it("presents NORMAL from the read model without recalculating", () => {
    expect(reportAllocationDisplay(base)).toEqual({
      allocatedLabel: "16h 40m",
      consumedLabel: "3h 20m",
      remainingLabel: "13h 20m",
      statusLabel: "Normal",
      statusTone: "default",
    });
  });

  it("presents WARNING from the read model", () => {
    expect(
      reportAllocationDisplay({
        ...base,
        consumedMinutes: 800,
        remainingMinutes: 200,
        allocationStatus: "WARNING",
      }),
    ).toMatchObject({
      statusLabel: "Warning",
      statusTone: "warning",
    });
  });

  it("presents EXCEEDED from the read model", () => {
    expect(
      reportAllocationDisplay({
        ...base,
        consumedMinutes: 1200,
        remainingMinutes: 0,
        allocationStatus: "EXCEEDED",
      }),
    ).toMatchObject({
      statusLabel: "Exceeded",
      statusTone: "error",
    });
  });
});
