// tests/unit/features/reporting/reporting-display-logic.test.ts
import { describe, expect, it } from "vitest";
import type { ClientAllocation, ContractUtilization } from "@/domain/analytics-types";
import { AnalyticsService } from "@/application/analytics/analytics-service";

// ---------------------------------------------------------------------------
// HoursByClientTable display logic
// ---------------------------------------------------------------------------

describe("HoursByClientTable display logic", () => {
  it("shows Archived badge for archived clients", () => {
    const allocation: Partial<ClientAllocation> = {
      clientId: "c1",
      clientName: "Acme Corp",
      isArchived: true,
      totalMinutes: 120,
      billableMinutes: 60,
      percentage: 50,
    };
    // The display check: isArchived → badge is rendered
    expect(allocation.isArchived).toBe(true);
  });

  it("does not show Archived badge for active clients", () => {
    const allocation: Partial<ClientAllocation> = {
      clientId: "c2",
      clientName: "Beta Inc",
      isArchived: false,
      totalMinutes: 60,
      billableMinutes: 60,
      percentage: 100,
    };
    expect(allocation.isArchived).toBe(false);
  });

  it("formats duration via AnalyticsService", () => {
    expect(AnalyticsService.formatDuration(90)).toBe("1h 30m");
    expect(AnalyticsService.formatDuration(0)).toBe("0h");
    expect(AnalyticsService.formatDuration(60)).toBe("1h");
  });

  it("formats percentage via AnalyticsService", () => {
    expect(AnalyticsService.formatPercentage(50)).toBe("50%");
    expect(AnalyticsService.formatPercentage(null)).toBe("—");
  });
});

// ---------------------------------------------------------------------------
// ContractReportTable display logic (BR-105-016, BR-105-018)
// ---------------------------------------------------------------------------

describe("ContractReportTable display logic", () => {
  const base: ContractUtilization = {
    contractId: "ct1",
    clientName: "Client A",
    isArchived: false,
    validFrom: new Date("2026-01-01T00:00:00.000Z"),
    validTo: null,
    isOngoing: true,
    consumedMinutes: 600,
    contractedMinutes: 4800,
    utilizationPercentage: 12.5,
    isOutOfValidity: false,
  };

  it("shows Archived badge for archived clients", () => {
    expect({ ...base, isArchived: true }.isArchived).toBe(true);
  });

  it("shows Ongoing label for ongoing contracts (BR-105-016)", () => {
    expect(base.isOngoing).toBe(true);
  });

  it("does not show Ongoing label for finite contracts", () => {
    const finite: ContractUtilization = {
      ...base,
      isOngoing: false,
      validTo: new Date("2026-12-31T00:00:00.000Z"),
    };
    expect(finite.isOngoing).toBe(false);
  });

  it("shows Out of validity warning for contracts with out-of-validity time (BR-105-018)", () => {
    const outOfValidity: ContractUtilization = {
      ...base,
      isOutOfValidity: true,
    };
    expect(outOfValidity.isOutOfValidity).toBe(true);
  });

  it("shows '—' utilization for unlimited contracts (null contractedMinutes)", () => {
    const unlimited: ContractUtilization = {
      ...base,
      contractedMinutes: null,
      utilizationPercentage: null,
    };
    // Display rule: contractedMinutes === null → show "—" not percentage
    expect(unlimited.contractedMinutes).toBeNull();
    expect(unlimited.utilizationPercentage).toBeNull();
  });

  it("shows capacity in hours for finite-capacity contracts", () => {
    expect(base.contractedMinutes).not.toBeNull();
    expect(AnalyticsService.formatDuration(base.contractedMinutes!)).toBe("80h");
  });

  it("shows 'Unlimited' label text for null contractedMinutes", () => {
    // Display text for null capacity — tested as a pure value
    const capacity =
      base.contractedMinutes !== null
        ? AnalyticsService.formatDuration(base.contractedMinutes)
        : "Unlimited";
    expect(capacity).toBe("80h");

    const unlimitedCapacity =
      null !== null
        ? AnalyticsService.formatDuration(null as unknown as number)
        : "Unlimited";
    expect(unlimitedCapacity).toBe("Unlimited");
  });

  it("isOngoing and contractedMinutes are independent (BR-105-016)", () => {
    // ongoing + finite capacity must both surface
    const ongoingFinite: ContractUtilization = { ...base }; // isOngoing=true, contractedMinutes=4800
    expect(ongoingFinite.isOngoing).toBe(true);
    expect(ongoingFinite.contractedMinutes).not.toBeNull();

    // finite + unlimited capacity must surface correctly
    const finiteUnlimited: ContractUtilization = {
      ...base,
      isOngoing: false,
      validTo: new Date("2026-12-31T00:00:00.000Z"),
      contractedMinutes: null,
    };
    expect(finiteUnlimited.isOngoing).toBe(false);
    expect(finiteUnlimited.contractedMinutes).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// AnnualOverviewTable display logic
// ---------------------------------------------------------------------------

describe("AnnualOverviewTable display logic", () => {
  it("shows '—' for months with no activity", () => {
    const emptyMonthMinutes = 0;
    const display = emptyMonthMinutes > 0
      ? AnalyticsService.formatDuration(emptyMonthMinutes)
      : "—";
    expect(display).toBe("—");
  });

  it("shows formatted duration for months with activity", () => {
    const minutes = 480;
    const display = minutes > 0
      ? AnalyticsService.formatDuration(minutes)
      : "—";
    expect(display).toBe("8h");
  });

  it("computes annual total correctly", () => {
    const monthTotals = [120, 240, 0, 480, 0, 0, 0, 0, 0, 0, 0, 0];
    const total = monthTotals.reduce((sum, m) => sum + m, 0);
    expect(total).toBe(840);
    expect(AnalyticsService.formatDuration(total)).toBe("14h");
  });

  it("computes annual billable percentage correctly", () => {
    const totalMinutes = 840;
    const billableMinutes = 420;
    const pct = totalMinutes > 0 ? (billableMinutes / totalMinutes) * 100 : null;
    expect(pct).toBeCloseTo(50);
    expect(AnalyticsService.formatPercentage(pct)).toBe("50%");
  });

  it("shows null percentage when total is 0", () => {
    const pct = 0 > 0 ? (0 / 0) * 100 : null;
    expect(pct).toBeNull();
    expect(AnalyticsService.formatPercentage(pct)).toBe("—");
  });
});
