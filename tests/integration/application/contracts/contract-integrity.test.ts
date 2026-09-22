// tests/integration/application/contracts/contract-integrity.test.ts
import { describe, expect, it } from "vitest";

import { createClient } from "@/application/clients/create-client";
import { createContract } from "@/application/contracts/create-contract";
import type {
  ContractCreateInput,
  ContractUpdateInput,
} from "@/application/contracts/contract-input";
import { getContract } from "@/application/contracts/get-contract";
import { getContractCoveringDate } from "@/application/contracts/get-contract-covering-date";
import { updateContract } from "@/application/contracts/update-contract";
import { createFirstWorkspace } from "@/application/workspace/create-first-workspace";
import type { WorkspaceContext } from "@/application/workspace/workspace-context";
import { ClientNotFoundError } from "@/domain/client-errors";
import {
  ContractNotFoundError,
  InvalidContractInputError,
  OverlappingContractError,
} from "@/domain/contract-errors";

import { date, repositories, runInTransaction } from "../../persistence/helpers";

const UNKNOWN_ID = "00000000-0000-4000-8000-000000000099";

const workspaceInput = {
  timezone: "Europe/Rome",
  currency: "EUR",
} as const;

const createInput = {
  validFrom: "2026-01-01",
  validTo: "2026-07-01",
  billingModel: "HOURLY" as const,
  rate: "80",
  currency: "EUR",
};

async function createWorkspaceContext(suffix: string): Promise<WorkspaceContext> {
  const created = await createFirstWorkspace(
    `contract-int-${suffix}`,
    { ...workspaceInput, name: `Integrity ${suffix}` },
    { runInTransaction },
  );

  return created.context;
}

describe("contract application integrity", () => {
  it("rejects a missing or unknown client and an unknown contract", async () => {
    const context = await createWorkspaceContext("missing");

    await expect(
      createContract(
        context,
        { ...createInput, clientId: "" },
        repositories.clients,
        repositories.contracts,
      ),
    ).rejects.toBeInstanceOf(InvalidContractInputError);
    await expect(
      createContract(
        context,
        { ...createInput, clientId: UNKNOWN_ID },
        repositories.clients,
        repositories.contracts,
      ),
    ).rejects.toBeInstanceOf(ClientNotFoundError);
    await expect(
      getContract(context, UNKNOWN_ID, repositories.contracts),
    ).rejects.toBeInstanceOf(ContractNotFoundError);
    await expect(
      updateContract(
        context,
        UNKNOWN_ID,
        {
          validFrom: "2026-01-01",
          billingModel: "HOURLY",
          rate: "80",
          currency: "EUR",
        },
        runInTransaction,
      ),
    ).rejects.toBeInstanceOf(ContractNotFoundError);
  });

  it("ignores browser-supplied workspaceId and cannot reassign clientId", async () => {
    const contextA = await createWorkspaceContext("trust-a");
    const contextB = await createWorkspaceContext("trust-b");
    const clientA = await createClient(
      contextA,
      { companyName: "Trusted Client" },
      repositories.clients,
    );
    const clientB = await createClient(
      contextB,
      { companyName: "Foreign Client" },
      repositories.clients,
    );

    const created = await createContract(
      contextA,
      {
        ...createInput,
        clientId: clientA.id,
        workspaceId: contextB.workspaceId,
      } as ContractCreateInput & { workspaceId: string },
      repositories.clients,
      repositories.contracts,
    );

    const updated = await updateContract(
      contextA,
      created.id,
      {
        validFrom: "2026-01-01",
        validTo: "2026-07-01",
        billingModel: "DAILY",
        rate: "500",
        currency: "USD",
        monthlyContractedHours: "10",
        paymentTermsDays: "30",
        paymentTermsNote: "Net 30",
        clientId: clientB.id,
        workspaceId: contextB.workspaceId,
      } as ContractUpdateInput & { clientId: string; workspaceId: string },
      runInTransaction,
    );

    expect(created.workspaceId).toBe(contextA.workspaceId);
    expect(created.clientId).toBe(clientA.id);
    expect(updated).toMatchObject({
      workspaceId: contextA.workspaceId,
      clientId: clientA.id,
      billingModel: "DAILY",
      rate: "500.0000",
      currency: "USD",
      monthlyContractedMinutes: 600,
      paymentTermsDays: 30,
      paymentTermsNote: "Net 30",
    });
    expect(updated.workspaceId).not.toBe(contextB.workspaceId);
    expect(updated.clientId).not.toBe(clientB.id);
  });

  it("keeps the earlier contract and TimeEntry association after later writes", async () => {
    const context = await createWorkspaceContext("history");
    const client = await createClient(
      context,
      { companyName: "History Client" },
      repositories.clients,
    );
    const first = await createContract(
      context,
      { ...createInput, clientId: client.id },
      repositories.clients,
      repositories.contracts,
    );
    const timeEntry = await repositories.timeEntries.recordTimeEntry(
      context.workspaceId,
      {
        userId: context.userId,
        clientId: client.id,
        contractId: first.id,
        workDate: date("2026-03-01"),
        durationMinutes: 60,
        billable: true,
      },
    );
    const later = await createContract(
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

    const earlierAfterLater = await getContract(
      context,
      first.id,
      repositories.contracts,
    );
    const updatedLater = await updateContract(
      context,
      later.id,
      {
        validFrom: "2026-07-01",
        validTo: null,
        billingModel: "HOURLY",
        rate: "95",
        currency: "EUR",
      },
      runInTransaction,
    );
    const persistedEntry = await repositories.timeEntries.getTimeEntry(
      context.workspaceId,
      timeEntry.id,
    );

    expect(earlierAfterLater).toMatchObject({
      id: first.id,
      clientId: client.id,
      rate: "80.0000",
      validFrom: date("2026-01-01"),
      validTo: date("2026-07-01"),
    });
    expect(updatedLater.rate).toBe("95.0000");
    expect(persistedEntry).toMatchObject({
      id: timeEntry.id,
      contractId: first.id,
    });
    expect(persistedEntry?.contractId).not.toBe(later.id);
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
    ).toMatchObject({ id: later.id });
  });

  it("rejects concurrent overlapping creates at the persistence boundary", async () => {
    const context = await createWorkspaceContext("concurrent");
    const client = await createClient(
      context,
      { companyName: "Concurrent Client" },
      repositories.clients,
    );

    const results = await Promise.allSettled([
      createContract(
        context,
        { ...createInput, clientId: client.id },
        repositories.clients,
        repositories.contracts,
      ),
      createContract(
        context,
        {
          ...createInput,
          clientId: client.id,
          validFrom: "2026-03-01",
          validTo: "2026-09-01",
          rate: "90",
        },
        repositories.clients,
        repositories.contracts,
      ),
    ]);

    const fulfilled = results.filter((result) => result.status === "fulfilled");
    const rejected = results.filter((result) => result.status === "rejected");

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect(rejected[0]?.status === "rejected" ? rejected[0].reason : null).toBeInstanceOf(
      OverlappingContractError,
    );
  });
});
