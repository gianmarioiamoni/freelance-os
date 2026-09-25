// tests/unit/application/analytics/contract-allocation.test.ts
import { describe, expect, it, vi } from "vitest";

import { AnalyticsService } from "@/application/analytics/analytics-service";
import type { ContractAllocationFact } from "@/domain/analytics-types";
import type { AnalyticsRepository, WorkspaceMemberRepository } from "@/domain/repositories";
import type { WorkspaceContext } from "@/application/workspace/workspace-context";
import type { WorkspaceMemberRecord } from "@/domain/persistence-types";
import { ContractNotFoundError } from "@/domain/contract-errors";
import { UnauthorizedWorkspaceAccessError } from "@/domain/workspace-errors";

function fact(overrides: Partial<ContractAllocationFact> = {}): ContractAllocationFact {
  return {
    contractId: "contract-a",
    allocatedMinutes: 1000,
    validFrom: new Date("2026-01-01T00:00:00.000Z"),
    validTo: new Date("2026-12-31T00:00:00.000Z"),
    consumedMinutes: 0,
    ...overrides,
  };
}

function allocation(overrides: Partial<ContractAllocationFact> = {}) {
  return AnalyticsService.calculateContractAllocation(fact(overrides));
}

describe("Contract allocation remaining and status", () => {
  it("has no status or remaining when allocation is null", () => {
    const result = allocation({ allocatedMinutes: null, consumedMinutes: 400 });
    expect(result.allocatedMinutes).toBeNull();
    expect(result.consumedMinutes).toBe(400);
    expect(result.remainingMinutes).toBeNull();
    expect(result.allocationStatus).toBeNull();
  });

  it("has no status when allocation is zero, regardless of consumption", () => {
    const unused = allocation({ allocatedMinutes: 0, consumedMinutes: 0 });
    expect(unused.remainingMinutes).toBe(0);
    expect(unused.allocationStatus).toBeNull();

    const used = allocation({ allocatedMinutes: 0, consumedMinutes: 1 });
    expect(used.remainingMinutes).toBe(0);
    expect(used.allocationStatus).toBeNull();
  });

  it("keeps remaining at the unused positive allocation", () => {
    const result = allocation({ allocatedMinutes: 1000, consumedMinutes: 0 });
    expect(result.remainingMinutes).toBe(1000);
    expect(result.allocationStatus).toBe("NORMAL");
  });

  it("is NORMAL below 80%", () => {
    expect(allocation({ consumedMinutes: 799 }).allocationStatus).toBe("NORMAL");
    expect(allocation({ consumedMinutes: 799 }).remainingMinutes).toBe(201);
  });

  it("is WARNING at exactly 80%", () => {
    expect(allocation({ consumedMinutes: 800 }).allocationStatus).toBe("WARNING");
    expect(allocation({ consumedMinutes: 800 }).remainingMinutes).toBe(200);
  });

  it("is WARNING between 80% and 100%", () => {
    expect(allocation({ consumedMinutes: 900 }).allocationStatus).toBe("WARNING");
  });

  it("is WARNING at exactly 100%", () => {
    expect(allocation({ consumedMinutes: 1000 }).allocationStatus).toBe("WARNING");
    expect(allocation({ consumedMinutes: 1000 }).remainingMinutes).toBe(0);
  });

  it("is EXCEEDED above 100%", () => {
    expect(allocation({ consumedMinutes: 1001 }).allocationStatus).toBe("EXCEEDED");
  });

  it("never returns a negative remaining", () => {
    expect(allocation({ consumedMinutes: 1500 }).remainingMinutes).toBe(0);
    expect(allocation({ allocatedMinutes: 0, consumedMinutes: 50 }).remainingMinutes).toBe(0);
  });
});

describe("AnalyticsService contract allocation access", () => {
  const context: WorkspaceContext = {
    workspaceId: "workspace-123",
    userId: "user-1",
    role: "OWNER",
    timezone: "UTC",
  };

  const membership: WorkspaceMemberRecord = {
    workspaceId: "workspace-123",
    userId: "user-1",
    role: "OWNER",
    createdAt: new Date(),
  };

  function members(member: WorkspaceMemberRecord | null): WorkspaceMemberRepository {
    return {
      getMember: vi.fn().mockResolvedValue(member),
      addMember: vi.fn(),
      listMembers: vi.fn(),
      listMembershipsByUserId: vi.fn(),
    };
  }

  function analytics(
    overrides: Partial<AnalyticsRepository> = {},
  ): AnalyticsRepository {
    return {
      getMonthlyAnalytics: vi.fn(),
      getDailyAnalytics: vi.fn(),
      getClientAllocations: vi.fn(),
      getContractUtilizations: vi.fn(),
      listTimeEntriesForPeriod: vi.fn(),
      listExpectedContracts: vi.fn(),
      getContractAllocationFact: vi.fn().mockResolvedValue(null),
      listContractAllocationFacts: vi.fn().mockResolvedValue([]),
      ...overrides,
    };
  }

  it("rejects a non-member before reading allocation", async () => {
    const getContractAllocationFact = vi.fn();
    const service = new AnalyticsService(
      analytics({ getContractAllocationFact }),
      members(null),
    );

    await expect(service.getContractAllocation(context, "contract-a")).rejects.toThrow(
      UnauthorizedWorkspaceAccessError,
    );
    await expect(service.listContractAllocations(context)).rejects.toThrow(
      UnauthorizedWorkspaceAccessError,
    );
    expect(getContractAllocationFact).not.toHaveBeenCalled();
  });

  it("throws ContractNotFoundError when the workspace has no such contract", async () => {
    const service = new AnalyticsService(analytics(), members(membership));
    await expect(service.getContractAllocation(context, "missing")).rejects.toThrow(
      ContractNotFoundError,
    );
  });

  it("returns the derived view for a workspace-scoped fact", async () => {
    const service = new AnalyticsService(
      analytics({
        getContractAllocationFact: vi.fn().mockResolvedValue(fact({ consumedMinutes: 800 })),
        listContractAllocationFacts: vi.fn().mockResolvedValue([
          fact({ contractId: "contract-a", consumedMinutes: 800 }),
          fact({ contractId: "contract-b", allocatedMinutes: null, consumedMinutes: 10 }),
        ]),
      }),
      members(membership),
    );

    const one = await service.getContractAllocation(context, "contract-a");
    expect(one.allocationStatus).toBe("WARNING");
    expect(one.remainingMinutes).toBe(200);

    const listed = await service.listContractAllocations(context);
    expect(listed).toHaveLength(2);
    expect(listed[1]?.allocationStatus).toBeNull();
  });

  it("passes Client/Contract filter to listContractAllocationFacts", async () => {
    const listContractAllocationFacts = vi.fn().mockResolvedValue([]);
    const service = new AnalyticsService(
      analytics({ listContractAllocationFacts }),
      members(membership),
    );
    const filter = { clientId: "client-1", contractId: "contract-1" };

    await service.listContractAllocations(context, filter);

    expect(listContractAllocationFacts).toHaveBeenCalledWith(
      context.workspaceId,
      filter,
    );
  });
});
