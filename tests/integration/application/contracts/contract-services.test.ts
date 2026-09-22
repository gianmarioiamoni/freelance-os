// tests/integration/application/contracts/contract-services.test.ts
import { describe, expect, it } from "vitest";

import { archiveClient } from "@/application/clients/archive-client";
import { createClient } from "@/application/clients/create-client";
import { createContract } from "@/application/contracts/create-contract";
import { getContract } from "@/application/contracts/get-contract";
import { getContractCoveringDate } from "@/application/contracts/get-contract-covering-date";
import { listContracts } from "@/application/contracts/list-contracts";
import { listContractsForClient } from "@/application/contracts/list-contracts-for-client";
import { updateContract } from "@/application/contracts/update-contract";
import { createFirstWorkspace } from "@/application/workspace/create-first-workspace";
import type { WorkspaceContext } from "@/application/workspace/workspace-context";
import { ClientNotFoundError } from "@/domain/client-errors";
import {
  ClientArchivedError,
  ContractNotFoundError,
  InvalidContractPeriodError,
  OverlappingContractError,
} from "@/domain/contract-errors";

import { date, repositories, runInTransaction } from "../../persistence/helpers";

const workspaceInput = {
  timezone: "Europe/Rome",
  currency: "EUR",
} as const;

async function createWorkspaceContext(suffix: string): Promise<WorkspaceContext> {
  const created = await createFirstWorkspace(
    `contract-app-${suffix}`,
    { ...workspaceInput, name: `Workspace ${suffix}` },
    { runInTransaction },
  );

  return created.context;
}

const createInput = {
  validFrom: "2026-01-01",
  validTo: "2026-07-01",
  billingModel: "HOURLY" as const,
  rate: "80",
  currency: "EUR",
};

describe("contract application services", () => {
  it("creates, gets, lists, and updates a contract in the authorized workspace", async () => {
    const context = await createWorkspaceContext("crud");
    const client = await createClient(
      context,
      { companyName: "Client CRUD" },
      repositories.clients,
    );

    const created = await createContract(
      context,
      { ...createInput, clientId: client.id },
      repositories.clients,
      repositories.contracts,
    );

    expect(created).toMatchObject({
      workspaceId: context.workspaceId,
      clientId: client.id,
      billingModel: "HOURLY",
      currency: "EUR",
    });

    const found = await getContract(context, created.id, repositories.contracts);
    const listed = await listContracts(context, repositories.contracts);
    const listedForClient = await listContractsForClient(
      context,
      client.id,
      repositories.clients,
      repositories.contracts,
    );

    expect(found.id).toBe(created.id);
    expect(listed.map((row) => row.id)).toContain(created.id);
    expect(listedForClient).toHaveLength(1);

    const updated = await updateContract(
      context,
      created.id,
      {
        validFrom: "2026-01-01",
        validTo: "2026-08-01",
        billingModel: "DAILY",
        rate: "500",
        currency: "USD",
        monthlyContractedHours: "20",
        paymentTermsDays: "15",
        paymentTermsNote: "Net 15",
      },
      repositories.clients,
      repositories.contracts,
      repositories.invoices,
    );

    expect(updated).toMatchObject({
      workspaceId: context.workspaceId,
      clientId: client.id,
      billingModel: "DAILY",
      rate: "500.0000",
      currency: "USD",
      monthlyContractedMinutes: 1200,
      paymentTermsDays: 15,
      paymentTermsNote: "Net 15",
    });
  });

  it("never returns or mutates another workspace's contracts", async () => {
    const contextA = await createWorkspaceContext("iso-a");
    const contextB = await createWorkspaceContext("iso-b");
    const clientA = await createClient(
      contextA,
      { companyName: "Client A" },
      repositories.clients,
    );
    const clientB = await createClient(
      contextB,
      { companyName: "Client B" },
      repositories.clients,
    );
    const contractA = await createContract(
      contextA,
      { ...createInput, clientId: clientA.id },
      repositories.clients,
      repositories.contracts,
    );
    const contractB = await createContract(
      contextB,
      { ...createInput, clientId: clientB.id },
      repositories.clients,
      repositories.contracts,
    );

    await expect(
      getContract(contextB, contractA.id, repositories.contracts),
    ).rejects.toBeInstanceOf(ContractNotFoundError);
    await expect(
      updateContract(
        contextB,
        contractA.id,
        {
          validFrom: "2026-02-01",
          billingModel: "HOURLY",
          rate: "1",
          currency: "EUR",
        },
        repositories.clients,
        repositories.contracts,
        repositories.invoices,
      ),
    ).rejects.toBeInstanceOf(ContractNotFoundError);
    await expect(
      createContract(
        contextB,
        { ...createInput, clientId: clientA.id },
        repositories.clients,
        repositories.contracts,
      ),
    ).rejects.toBeInstanceOf(ClientNotFoundError);
    await expect(
      listContractsForClient(
        contextB,
        clientA.id,
        repositories.clients,
        repositories.contracts,
      ),
    ).rejects.toBeInstanceOf(ClientNotFoundError);

    const listedB = await listContracts(contextB, repositories.contracts);
    expect(listedB.map((row) => row.id)).toEqual([contractB.id]);

    const unchanged = await getContract(
      contextA,
      contractA.id,
      repositories.contracts,
    );
    expect(unchanged).toMatchObject({
      id: contractA.id,
      workspaceId: contextA.workspaceId,
      clientId: clientA.id,
      rate: "80.0000",
    });
  });

  it("rejects create for an archived client and keeps existing contracts editable", async () => {
    const context = await createWorkspaceContext("archived");
    const client = await createClient(
      context,
      { companyName: "Archived Client" },
      repositories.clients,
    );
    const existing = await createContract(
      context,
      { ...createInput, clientId: client.id },
      repositories.clients,
      repositories.contracts,
    );

    await archiveClient(context, client.id, repositories.clients);

    await expect(
      createContract(
        context,
        {
          ...createInput,
          clientId: client.id,
          validFrom: "2026-07-01",
          validTo: null,
        },
        repositories.clients,
        repositories.contracts,
      ),
    ).rejects.toBeInstanceOf(ClientArchivedError);

    const readable = await getContract(
      context,
      existing.id,
      repositories.contracts,
    );
    const updated = await updateContract(
      context,
      existing.id,
      {
        validFrom: "2026-01-01",
        validTo: "2026-09-01",
        billingModel: "HOURLY",
        rate: "95",
        currency: "EUR",
      },
      repositories.clients,
      repositories.contracts,
      repositories.invoices,
    );
    const listed = await listContractsForClient(
      context,
      client.id,
      repositories.clients,
      repositories.contracts,
    );

    expect(readable.id).toBe(existing.id);
    expect(updated.rate).toBe("95.0000");
    expect(listed).toHaveLength(1);
  });

  it("rejects invalid periods and overlapping contracts", async () => {
    const context = await createWorkspaceContext("overlap");
    const client = await createClient(
      context,
      { companyName: "Overlap Client" },
      repositories.clients,
    );

    await expect(
      createContract(
        context,
        {
          ...createInput,
          clientId: client.id,
          validFrom: "2026-07-01",
          validTo: "2026-07-01",
        },
        repositories.clients,
        repositories.contracts,
      ),
    ).rejects.toBeInstanceOf(InvalidContractPeriodError);

    const first = await createContract(
      context,
      { ...createInput, clientId: client.id },
      repositories.clients,
      repositories.contracts,
    );

    await expect(
      createContract(
        context,
        {
          ...createInput,
          clientId: client.id,
          validFrom: "2026-06-15",
          validTo: null,
        },
        repositories.clients,
        repositories.contracts,
      ),
    ).rejects.toBeInstanceOf(OverlappingContractError);

    const adjacent = await createContract(
      context,
      {
        ...createInput,
        clientId: client.id,
        validFrom: "2026-07-01",
        validTo: null,
        rate: "90",
      },
      repositories.clients,
      repositories.contracts,
    );

    await expect(
      updateContract(
        context,
        adjacent.id,
        {
          validFrom: "2026-06-15",
          validTo: null,
          billingModel: "HOURLY",
          rate: "90",
          currency: "EUR",
        },
        repositories.clients,
        repositories.contracts,
        repositories.invoices,
      ),
    ).rejects.toBeInstanceOf(OverlappingContractError);

    expect(first.clientId).toBe(client.id);
    expect(
      await getContractCoveringDate(
        context,
        client.id,
        date("2026-06-30"),
        repositories.clients,
        repositories.contracts,
      ),
    ).toMatchObject({ id: first.id });
    expect(
      await getContractCoveringDate(
        context,
        client.id,
        date("2026-07-01"),
        repositories.clients,
        repositories.contracts,
      ),
    ).toMatchObject({ id: adjacent.id });
  });
});
