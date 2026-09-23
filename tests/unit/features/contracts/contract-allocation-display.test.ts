// tests/unit/features/contracts/contract-allocation-display.test.ts
import { describe, expect, it } from "vitest";

import type { ContractAllocation } from "@/domain/analytics-types";
import {
  ALLOCATION_NOT_CONFIGURED_LABEL,
  allocationStatusLabel,
  allocationStatusTone,
  formatAllocationMinutes,
  hasActiveAllocation,
  isZeroAllocation,
} from "@/features/contracts/contract-allocation-display";

function allocation(
  overrides: Partial<ContractAllocation> = {},
): ContractAllocation {
  return {
    contractId: "contract-1",
    allocatedMinutes: 1000,
    consumedMinutes: 0,
    remainingMinutes: 1000,
    allocationStatus: "NORMAL",
    ...overrides,
  };
}

describe("contract allocation display", () => {
  it("shows no status for null allocation", () => {
    const view = allocation({
      allocatedMinutes: null,
      remainingMinutes: null,
      allocationStatus: null,
    });

    expect(hasActiveAllocation(view)).toBe(false);
    expect(isZeroAllocation(view)).toBe(false);
    expect(allocationStatusLabel(view.allocationStatus)).toBeNull();
    expect(allocationStatusTone(view.allocationStatus)).toBeNull();
    expect(ALLOCATION_NOT_CONFIGURED_LABEL).toMatch(/not configured/i);
  });

  it("shows no status for zero allocation", () => {
    const view = allocation({
      allocatedMinutes: 0,
      consumedMinutes: 50,
      remainingMinutes: 0,
      allocationStatus: null,
    });

    expect(isZeroAllocation(view)).toBe(true);
    expect(hasActiveAllocation(view)).toBe(false);
    expect(allocationStatusLabel(view.allocationStatus)).toBeNull();
  });

  it("renders server-derived remaining and status for a positive allocation", () => {
    const view = allocation({
      consumedMinutes: 800,
      remainingMinutes: 200,
      allocationStatus: "WARNING",
    });

    expect(hasActiveAllocation(view)).toBe(true);
    expect(formatAllocationMinutes(view.allocatedMinutes ?? 0)).toBe("1000 minutes");
    expect(formatAllocationMinutes(view.consumedMinutes)).toBe("800 minutes");
    expect(formatAllocationMinutes(view.remainingMinutes ?? 0)).toBe("200 minutes");
    expect(allocationStatusLabel(view.allocationStatus)).toBe("Warning");
    expect(allocationStatusTone(view.allocationStatus)).toBe("warning");
  });

  it("uses the existing warning and exceeded presentation tones", () => {
    expect(allocationStatusTone("NORMAL")).toBe("default");
    expect(allocationStatusTone("WARNING")).toBe("warning");
    expect(allocationStatusTone("EXCEEDED")).toBe("error");
    expect(allocationStatusLabel("EXCEEDED")).toBe("Exceeded");
  });
});
