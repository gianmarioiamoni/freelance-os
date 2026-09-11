// tests/integration/persistence/contracts.test.ts
import { describe, expect, it } from "vitest";

import { ConstraintViolationError } from "@/domain/persistence-errors";

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
});
