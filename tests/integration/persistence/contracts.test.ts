// tests/integration/persistence/contracts.test.ts
import { describe, expect, it } from "vitest";

import {
  ConstraintViolationError,
  RecordNotFoundError,
} from "@/domain/persistence-errors";

import { createWorkspaceGraph } from "./fixtures";
import { date, repositories } from "./helpers";

describe("contract temporal integrity", () => {
  it("persists a valid contract", async () => {
    const graph = await createWorkspaceGraph(repositories, "valid");
    const contract = await repositories.contracts.getContract(graph.workspaceId, graph.contractId);

    expect(contract).toMatchObject({
      clientId: graph.clientId,
      billingModel: "HOURLY",
      rate: "80.0000",
    });
  });

  it("allows non-overlapping contracts for the same client", async () => {
    const graph = await createWorkspaceGraph(repositories, "adjacent");

    const next = await repositories.contracts.createContract(graph.workspaceId, {
      clientId: graph.clientId,
      validFrom: date("2026-07-01"),
      validTo: date("2027-01-01"),
      billingModel: "DAILY",
      rate: "500.0000",
      currency: "EUR",
    });

    expect(next.id).not.toBe(graph.contractId);
    expect(await repositories.contracts.listContractsForClient(graph.workspaceId, graph.clientId)).toHaveLength(2);
  });

  it("rejects overlapping contracts for the same client", async () => {
    const graph = await createWorkspaceGraph(repositories, "overlap");

    await expect(
      repositories.contracts.createContract(graph.workspaceId, {
        clientId: graph.clientId,
        validFrom: date("2026-06-15"),
        validTo: date("2026-08-01"),
        billingModel: "HOURLY",
        rate: "90.0000",
        currency: "EUR",
      }),
    ).rejects.toBeInstanceOf(ConstraintViolationError);
  });

  it("treats open-ended contracts as unbounded and rejects collisions", async () => {
    const graph = await createWorkspaceGraph(repositories, "open");

    await repositories.contracts.createContract(graph.workspaceId, {
      clientId: graph.clientId,
      validFrom: date("2026-07-01"),
      validTo: null,
      billingModel: "HOURLY",
      rate: "95.0000",
      currency: "EUR",
    });

    await expect(
      repositories.contracts.createContract(graph.workspaceId, {
        clientId: graph.clientId,
        validFrom: date("2026-09-01"),
        validTo: date("2026-12-01"),
        billingModel: "HOURLY",
        rate: "100.0000",
        currency: "EUR",
      }),
    ).rejects.toBeInstanceOf(ConstraintViolationError);
  });

  it("does not treat same-dated contracts on different clients or workspaces as collisions", async () => {
    const workspaceA = await createWorkspaceGraph(repositories, "scope-a");
    const workspaceB = await createWorkspaceGraph(repositories, "scope-b");

    const otherClient = await repositories.clients.createClient(workspaceA.workspaceId, {
      companyName: "Other Client",
    });

    const otherClientContract = await repositories.contracts.createContract(workspaceA.workspaceId, {
      clientId: otherClient.id,
      validFrom: date("2026-01-01"),
      validTo: date("2026-07-01"),
      billingModel: "HOURLY",
      rate: "70.0000",
      currency: "EUR",
    });

    expect(otherClientContract.clientId).toBe(otherClient.id);
    expect(await repositories.contracts.getContract(workspaceB.workspaceId, workspaceA.contractId)).toBeNull();
    expect(
      await repositories.contracts.listContractsForClient(workspaceA.workspaceId, otherClient.id),
    ).toHaveLength(1);
  });

  it("updates allowed contract fields without changing workspace or client", async () => {
    const graph = await createWorkspaceGraph(repositories, "update");

    const updated = await repositories.contracts.updateContract(graph.workspaceId, graph.contractId, {
      validFrom: date("2026-01-01"),
      validTo: date("2026-08-01"),
      billingModel: "DAILY",
      rate: "500.0000",
      currency: "USD",
      monthlyContractedMinutes: 1200,
      paymentTermsDays: 15,
      paymentTermsNote: "Net 15",
    });

    expect(updated).toMatchObject({
      id: graph.contractId,
      workspaceId: graph.workspaceId,
      clientId: graph.clientId,
      billingModel: "DAILY",
      rate: "500.0000",
      currency: "USD",
      monthlyContractedMinutes: 1200,
      paymentTermsDays: 15,
      paymentTermsNote: "Net 15",
    });
  });

  it("scopes list and update by workspace", async () => {
    const workspaceA = await createWorkspaceGraph(repositories, "list-a");
    const workspaceB = await createWorkspaceGraph(repositories, "list-b");

    const listedB = await repositories.contracts.listContracts(workspaceB.workspaceId);

    expect(listedB.every((row) => row.workspaceId === workspaceB.workspaceId)).toBe(true);
    expect(listedB.some((row) => row.id === workspaceA.contractId)).toBe(false);

    await expect(
      repositories.contracts.updateContract(workspaceB.workspaceId, workspaceA.contractId, {
        validFrom: date("2026-01-01"),
        validTo: date("2026-07-01"),
        billingModel: "HOURLY",
        rate: "1.0000",
        currency: "EUR",
      }),
    ).rejects.toBeInstanceOf(RecordNotFoundError);

    expect(
      await repositories.contracts.getContract(workspaceA.workspaceId, workspaceA.contractId),
    ).toMatchObject({
      id: workspaceA.contractId,
      rate: "80.0000",
    });
  });

  it("rejects an overlapping update at the database boundary", async () => {
    const graph = await createWorkspaceGraph(repositories, "update-overlap");

    const later = await repositories.contracts.createContract(graph.workspaceId, {
      clientId: graph.clientId,
      validFrom: date("2026-07-01"),
      validTo: null,
      billingModel: "HOURLY",
      rate: "90.0000",
      currency: "EUR",
    });

    await expect(
      repositories.contracts.updateContract(graph.workspaceId, later.id, {
        validFrom: date("2026-06-15"),
        validTo: null,
        billingModel: "HOURLY",
        rate: "90.0000",
        currency: "EUR",
      }),
    ).rejects.toBeInstanceOf(ConstraintViolationError);
  });

  it("rejects concurrent overlapping inserts through the exclusion constraint", async () => {
    const graph = await createWorkspaceGraph(repositories, "concurrent");

    const results = await Promise.allSettled([
      repositories.contracts.createContract(graph.workspaceId, {
        clientId: graph.clientId,
        validFrom: date("2026-07-01"),
        validTo: date("2027-01-01"),
        billingModel: "HOURLY",
        rate: "90.0000",
        currency: "EUR",
      }),
      repositories.contracts.createContract(graph.workspaceId, {
        clientId: graph.clientId,
        validFrom: date("2026-08-01"),
        validTo: date("2027-02-01"),
        billingModel: "DAILY",
        rate: "500.0000",
        currency: "EUR",
      }),
    ]);

    const fulfilled = results.filter((result) => result.status === "fulfilled");
    const rejected = results.filter((result) => result.status === "rejected");

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect(rejected[0]?.status === "rejected" ? rejected[0].reason : null).toBeInstanceOf(
      ConstraintViolationError,
    );
  });

  it("does not rewrite TimeEntry.contractId when a contract is updated", async () => {
    const graph = await createWorkspaceGraph(repositories, "te-update");
    const timeEntry = await repositories.timeEntries.recordTimeEntry(graph.workspaceId, {
      userId: graph.userId,
      clientId: graph.clientId,
      contractId: graph.contractId,
      workDate: date("2026-03-01"),
      durationMinutes: 60,
      billable: true,
    });

    const updated = await repositories.contracts.updateContract(graph.workspaceId, graph.contractId, {
      validFrom: date("2026-01-01"),
      validTo: date("2026-07-01"),
      billingModel: "DAILY",
      rate: "99.0000",
      currency: "USD",
    });
    const persisted = await repositories.timeEntries.getTimeEntry(graph.workspaceId, timeEntry.id);

    expect(updated.rate).toBe("99.0000");
    expect(persisted).toMatchObject({
      id: timeEntry.id,
      contractId: graph.contractId,
      clientId: graph.clientId,
    });
  });
});

