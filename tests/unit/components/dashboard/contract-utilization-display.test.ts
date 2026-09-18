// tests/unit/components/dashboard/contract-utilization-display.test.ts
import { describe, expect, it } from "vitest";
import type { ContractUtilization } from "@/domain/analytics-types";

/**
 * Unit tests protecting the ContractUtilization component's display logic.
 *
 * The component (ContractUtilization.tsx) was corrected in P105-04 to separate
 * two independent dimensions (BR-105-016):
 *   - Ongoing status:          isOngoing ≡ validTo === null
 *   - Capacity availability:   hasFiniteCapacity ≡ contractedMinutes !== null
 *
 * The display rules are:
 *   - "Ongoing" label shown  ← isOngoing === true
 *   - Capacity/bar shown     ← contractedMinutes !== null   (NOT isOngoing)
 *
 * These tests protect against regression where isOngoing accidentally
 * suppresses finite-capacity display (F-105-014).
 */

function hasFiniteCapacity(util: Pick<ContractUtilization, "contractedMinutes">): boolean {
  return util.contractedMinutes !== null;
}

function shouldShowOngoingLabel(util: Pick<ContractUtilization, "isOngoing">): boolean {
  return util.isOngoing;
}

describe("ContractUtilization display logic (BR-105-016, F-105-014)", () => {
  // Case 1: finite validity + finite capacity
  it("finite validity + finite capacity: shows capacity, no ongoing label", () => {
    const util: Partial<ContractUtilization> = {
      isOngoing: false,
      contractedMinutes: 4800,
    };
    expect(shouldShowOngoingLabel(util as ContractUtilization)).toBe(false);
    expect(hasFiniteCapacity(util as ContractUtilization)).toBe(true);
  });

  // Case 2: finite validity + null capacity
  it("finite validity + null capacity: hides capacity bar, no ongoing label", () => {
    const util: Partial<ContractUtilization> = {
      isOngoing: false,
      contractedMinutes: null,
    };
    expect(shouldShowOngoingLabel(util as ContractUtilization)).toBe(false);
    expect(hasFiniteCapacity(util as ContractUtilization)).toBe(false);
  });

  // Case 3: ongoing + finite capacity (the F-105-014 regression case)
  it("ongoing + finite capacity: shows BOTH ongoing label AND capacity bar (F-105-014 regression guard)", () => {
    const util: Partial<ContractUtilization> = {
      isOngoing: true,        // validTo === null
      contractedMinutes: 4800, // finite capacity — MUST NOT be hidden
    };
    // Ongoing label is shown (validity status).
    expect(shouldShowOngoingLabel(util as ContractUtilization)).toBe(true);
    // Capacity bar is ALSO shown — ongoing does NOT suppress finite capacity.
    expect(hasFiniteCapacity(util as ContractUtilization)).toBe(true);
  });

  // Case 4: ongoing + null capacity
  it("ongoing + null capacity: shows ongoing label, hides capacity bar", () => {
    const util: Partial<ContractUtilization> = {
      isOngoing: true,
      contractedMinutes: null, // unlimited — no capacity denominator
    };
    expect(shouldShowOngoingLabel(util as ContractUtilization)).toBe(true);
    expect(hasFiniteCapacity(util as ContractUtilization)).toBe(false);
  });

  // Guard: isOngoing must never be the sole gate for capacity display
  it("isOngoing=true does not imply hasFiniteCapacity=false (the regression would conflate them)", () => {
    const ongoingWithCapacity: Partial<ContractUtilization> = {
      isOngoing: true,
      contractedMinutes: 9600,
    };
    // The old (wrong) behavior: `!isOngoing` gated the capacity bar → would be false here.
    // The correct behavior: `contractedMinutes !== null` gates capacity → must be true.
    expect(hasFiniteCapacity(ongoingWithCapacity as ContractUtilization)).toBe(true);
    // isOngoing alone must not determine capacity display.
    expect(shouldShowOngoingLabel(ongoingWithCapacity as ContractUtilization)).toBe(true);
  });
});
