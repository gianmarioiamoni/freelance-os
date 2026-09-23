// tests/integration/analytics/contract-allocation.test.ts
import { describe, expect, it } from "vitest";

import { AnalyticsService } from "@/application/analytics/analytics-service";
import { createClient } from "@/application/clients/create-client";
import { createContract } from "@/application/contracts/create-contract";
import { createFirstWorkspace } from "@/application/workspace/create-first-workspace";
import type { WorkspaceContext } from "@/application/workspace/workspace-context";
import { ContractNotFoundError } from "@/domain/contract-errors";

import { createWorkspaceGraph } from "../persistence/fixtures";
import { date, repositories, runInTransaction } from "../persistence/helpers";

async function workspace(suffix: string): Promise<WorkspaceContext> {
  const created = await createFirstWorkspace(
    `alloc-${suffix}`,
    { name: `Allocation ${suffix}`, timezone: "Europe/Rome", currency: "EUR" },
    { runInTransaction },
  );
  return created.context;
}

function service() {
  return new AnalyticsService(repositories.analytics, repositories.members);
}

const contractFields = {
  validFrom: "2026-06-01",
  validTo: "2026-07-01",
  billingModel: "HOURLY" as const,
  rate: "80",
  currency: "EUR",
};

describe("Contract allocation consumption", () => {
  it("counts all TimeEntries and excludes out-of-validity workDates", async () => {
    const context = await workspace("bounds");
    const client = await createClient(context, { companyName: "Alloc Client" }, repositories.clients);
    const contract = await createContract(
      context,
      { ...contractFields, clientId: client.id, allocatedMinutes: "1000" },
      repositories.clients,
      repositories.contracts,
    );

    await repositories.timeEntries.recordTimeEntry(context.workspaceId, {
      userId: context.userId,
      clientId: client.id,
      contractId: contract.id,
      workDate: date("2026-05-31"),
      durationMinutes: 120,
      billable: true,
    });
    await repositories.timeEntries.recordTimeEntry(context.workspaceId, {
      userId: context.userId,
      clientId: client.id,
      contractId: contract.id,
      workDate: date("2026-06-01"),
      durationMinutes: 60,
      billable: false,
    });
    await repositories.timeEntries.recordTimeEntry(context.workspaceId, {
      userId: context.userId,
      clientId: client.id,
      contractId: contract.id,
      workDate: date("2026-06-15"),
      durationMinutes: 90,
      billable: true,
    });
    await repositories.timeEntries.recordTimeEntry(context.workspaceId, {
      userId: context.userId,
      clientId: client.id,
      contractId: contract.id,
      workDate: date("2026-07-01"),
      durationMinutes: 200,
      billable: true,
    });

    const view = await service().getContractAllocation(context, contract.id);

    expect(view.consumedMinutes).toBe(150);
    expect(view.allocatedMinutes).toBe(1000);
    expect(view.remainingMinutes).toBe(850);
    expect(view.allocationStatus).toBe("NORMAL");
  });

  it("returns 0 consumption when no TimeEntries match", async () => {
    const context = await workspace("empty");
    const client = await createClient(context, { companyName: "Empty" }, repositories.clients);
    const contract = await createContract(
      context,
      { ...contractFields, clientId: client.id, allocatedMinutes: 0 },
      repositories.clients,
      repositories.contracts,
    );

    const view = await service().getContractAllocation(context, contract.id);
    expect(view.consumedMinutes).toBe(0);
    expect(view.allocatedMinutes).toBe(0);
    expect(view.remainingMinutes).toBe(0);
    expect(view.allocationStatus).toBeNull();
  });

  it("isolates consumption by workspace and aggregates per Contract", async () => {
    const workspaceA = await createWorkspaceGraph(repositories, "alloc-A");
    const workspaceB = await createWorkspaceGraph(repositories, "alloc-B");

    await repositories.contracts.updateContract(workspaceA.workspaceId, workspaceA.contractId, {
      validFrom: date("2026-01-01"),
      validTo: date("2026-07-01"),
      billingModel: "HOURLY",
      rate: "80.0000",
      currency: "EUR",
      allocatedMinutes: 480,
    });
    await repositories.contracts.updateContract(workspaceB.workspaceId, workspaceB.contractId, {
      validFrom: date("2026-01-01"),
      validTo: date("2026-07-01"),
      billingModel: "HOURLY",
      rate: "80.0000",
      currency: "EUR",
      allocatedMinutes: 480,
    });

    await repositories.timeEntries.recordTimeEntry(workspaceA.workspaceId, {
      userId: workspaceA.userId,
      clientId: workspaceA.clientId,
      contractId: workspaceA.contractId,
      workDate: date("2026-03-01"),
      durationMinutes: 100,
      billable: true,
    });
    await repositories.timeEntries.recordTimeEntry(workspaceB.workspaceId, {
      userId: workspaceB.userId,
      clientId: workspaceB.clientId,
      contractId: workspaceB.contractId,
      workDate: date("2026-03-01"),
      durationMinutes: 400,
      billable: true,
    });

    const contextA: WorkspaceContext = {
      workspaceId: workspaceA.workspaceId,
      userId: workspaceA.userId,
      role: "OWNER",
      timezone: "Europe/Rome",
    };
    const contextB: WorkspaceContext = {
      workspaceId: workspaceB.workspaceId,
      userId: workspaceB.userId,
      role: "OWNER",
      timezone: "Europe/Rome",
    };

    const listedA = await service().listContractAllocations(contextA);
    const listedB = await service().listContractAllocations(contextB);
    const oneA = await service().getContractAllocation(contextA, workspaceA.contractId);

    expect(listedA).toHaveLength(1);
    expect(listedA[0]?.consumedMinutes).toBe(100);
    expect(listedB[0]?.consumedMinutes).toBe(400);
    expect(oneA.consumedMinutes).toBe(100);

    await expect(
      service().getContractAllocation(contextA, workspaceB.contractId),
    ).rejects.toThrow(ContractNotFoundError);
  });
});
