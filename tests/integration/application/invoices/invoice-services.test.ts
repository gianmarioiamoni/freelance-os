// tests/integration/application/invoices/invoice-services.test.ts
import { describe, expect, it } from "vitest";

import { archiveClient } from "@/application/clients/archive-client";
import { createClient } from "@/application/clients/create-client";
import { createContract } from "@/application/contracts/create-contract";
import { updateContract } from "@/application/contracts/update-contract";
import { createInvoice } from "@/application/invoices/create-invoice";
import { getInvoice } from "@/application/invoices/get-invoice";
import { listInvoicesForContract } from "@/application/invoices/list-invoices-for-contract";
import { updateInvoice } from "@/application/invoices/update-invoice";
import { voidInvoice } from "@/application/invoices/void-invoice";
import { createFirstWorkspace } from "@/application/workspace/create-first-workspace";
import type { WorkspaceContext } from "@/application/workspace/workspace-context";
import {
  ContractCurrencyImmutableError,
  ContractNotFoundError,
} from "@/domain/contract-errors";
import {
  InvoiceAlreadyVoidedError,
  InvoiceNotEditableError,
  InvoiceNotFoundError,
  InvalidInvoiceInputError,
} from "@/domain/invoice-errors";
import { invoiceTrackingState } from "@/domain/invoice";

import { date, prisma, repositories, runInTransaction } from "../../persistence/helpers";

const workspaceInput = {
  timezone: "Europe/Rome",
  currency: "EUR",
} as const;

async function createWorkspaceContext(suffix: string): Promise<WorkspaceContext> {
  const created = await createFirstWorkspace(
    `invoice-app-${suffix}`,
    { ...workspaceInput, name: `Invoice ${suffix}` },
    { runInTransaction },
  );

  return created.context;
}

async function seedContract(
  context: WorkspaceContext,
  suffix: string,
  overrides: {
    validTo?: string | null;
    currency?: string;
    paymentTermsDays?: string | null;
  } = {},
) {
  const client = await createClient(
    context,
    { companyName: `Client ${suffix}` },
    repositories.clients,
  );
  const contract = await createContract(
    context,
    {
      clientId: client.id,
      validFrom: "2026-01-01",
      validTo: overrides.validTo === undefined ? "2026-07-01" : overrides.validTo,
      billingModel: "HOURLY",
      rate: "80",
      currency: overrides.currency ?? "EUR",
      paymentTermsDays: overrides.paymentTermsDays,
    },
    repositories.clients,
    repositories.contracts,
  );

  return { client, contract };
}

describe("invoice application services", () => {
  it("creates, reads, updates, and voids an invoice with persisted snapshots", async () => {
    const context = await createWorkspaceContext("crud");
    const { contract } = await seedContract(context, "crud", {
      paymentTermsDays: "30",
    });

    const created = await createInvoice(
      context,
      {
        contractId: contract.id,
        invoiceDate: "2026-09-01",
        amount: "1500.2500",
        reference: "INV-100",
      },
      repositories.contracts,
      repositories.invoices,
    );

    expect(created).toMatchObject({
      workspaceId: context.workspaceId,
      contractId: contract.id,
      amount: "1500.2500",
      currency: "EUR",
      paymentTermsDays: 30,
      reference: "INV-100",
    });
    expect(created.invoiceDate).toEqual(date("2026-09-01"));
    expect(created.dueDate).toEqual(date("2026-10-01"));

    const found = await getInvoice(context, created.id, repositories.invoices);
    const listed = await listInvoicesForContract(
      context,
      contract.id,
      repositories.contracts,
      repositories.invoices,
    );

    expect(found.id).toBe(created.id);
    expect(listed).toHaveLength(1);

    await updateContract(
      context,
      contract.id,
      {
        validFrom: "2026-01-01",
        validTo: "2026-07-01",
        billingModel: "HOURLY",
        rate: "80",
        currency: "EUR",
        paymentTermsDays: "7",
      },
      repositories.clients,
      repositories.contracts,
      repositories.invoices,
    );

    const updated = await updateInvoice(
      context,
      created.id,
      {
        invoiceDate: "2026-09-10",
        amount: "1750.5",
        reference: "INV-UPDATED",
      },
      repositories.invoices,
    );

    expect(updated).toMatchObject({
      amount: "1750.5000",
      currency: "EUR",
      paymentTermsDays: 30,
      reference: "INV-UPDATED",
    });
    expect(updated.invoiceDate).toEqual(date("2026-09-10"));
    expect(updated.dueDate).toEqual(date("2026-10-10"));

    const voided = await voidInvoice(context, created.id, repositories.invoices);
    const stillPresent = await prisma.invoice.findUnique({ where: { id: created.id } });
    const listedAfterVoid = await listInvoicesForContract(
      context,
      contract.id,
      repositories.contracts,
      repositories.invoices,
    );
    const listedVoid = await listInvoicesForContract(
      context,
      contract.id,
      repositories.contracts,
      repositories.invoices,
      "VOID",
    );

    expect(invoiceTrackingState(voided.voidedAt)).toBe("VOID");
    expect(stillPresent).not.toBeNull();
    expect(listedAfterVoid).toEqual([]);
    expect(listedVoid).toHaveLength(1);
    await expect(getInvoice(context, created.id, repositories.invoices)).resolves.toMatchObject({
      id: created.id,
    });
    await expect(voidInvoice(context, created.id, repositories.invoices)).rejects.toBeInstanceOf(
      InvoiceAlreadyVoidedError,
    );
    await expect(
      updateInvoice(context, created.id, { amount: "10" }, repositories.invoices),
    ).rejects.toBeInstanceOf(InvoiceNotEditableError);
  });

  it("allows invoices on an expired contract and an archived-client contract", async () => {
    const context = await createWorkspaceContext("arch");
    const { client, contract } = await seedContract(context, "arch", {
      validTo: "2026-02-01",
      paymentTermsDays: null,
    });

    const onExpired = await createInvoice(
      context,
      {
        contractId: contract.id,
        invoiceDate: "2026-09-01",
        amount: "100",
      },
      repositories.contracts,
      repositories.invoices,
    );

    expect(onExpired.dueDate).toBeNull();
    expect(onExpired.paymentTermsDays).toBeNull();

    await archiveClient(context, client.id, repositories.clients);

    const afterArchive = await createInvoice(
      context,
      {
        contractId: contract.id,
        invoiceDate: "2026-09-15",
        amount: "200",
        currency: "EUR",
      },
      repositories.contracts,
      repositories.invoices,
    );

    expect(afterArchive.contractId).toBe(contract.id);
    expect(afterArchive.currency).toBe("EUR");
  });

  it("rejects a supplied currency that diverges from the contract snapshot", async () => {
    const context = await createWorkspaceContext("ccy");
    const { contract } = await seedContract(context, "ccy");

    await expect(
      createInvoice(
        context,
        {
          contractId: contract.id,
          invoiceDate: "2026-09-01",
          amount: "100",
          currency: "USD",
        },
        repositories.contracts,
        repositories.invoices,
      ),
    ).rejects.toBeInstanceOf(InvalidInvoiceInputError);
  });

  it("guards contract currency after ACTIVE or VOID invoices in the same workspace only", async () => {
    const contextA = await createWorkspaceContext("guard-a");
    const contextB = await createWorkspaceContext("guard-b");
    const seededA = await seedContract(contextA, "guard-a");
    const seededB = await seedContract(contextB, "guard-b");

    await updateContract(
      contextB,
      seededB.contract.id,
      {
        validFrom: "2026-01-01",
        validTo: "2026-07-01",
        billingModel: "HOURLY",
        rate: "80",
        currency: "USD",
      },
      repositories.clients,
      repositories.contracts,
      repositories.invoices,
    );

    const invoiceA = await createInvoice(
      contextA,
      {
        contractId: seededA.contract.id,
        invoiceDate: "2026-09-01",
        amount: "100",
      },
      repositories.contracts,
      repositories.invoices,
    );

    await expect(
      updateContract(
        contextA,
        seededA.contract.id,
        {
          validFrom: "2026-01-01",
          validTo: "2026-07-01",
          billingModel: "HOURLY",
          rate: "80",
          currency: "USD",
        },
        repositories.clients,
        repositories.contracts,
        repositories.invoices,
      ),
    ).rejects.toBeInstanceOf(ContractCurrencyImmutableError);

    await voidInvoice(contextA, invoiceA.id, repositories.invoices);

    await expect(
      updateContract(
        contextA,
        seededA.contract.id,
        {
          validFrom: "2026-01-01",
          validTo: "2026-07-01",
          billingModel: "HOURLY",
          rate: "80",
          currency: "USD",
        },
        repositories.clients,
        repositories.contracts,
        repositories.invoices,
      ),
    ).rejects.toBeInstanceOf(ContractCurrencyImmutableError);

    const reloadedB = await repositories.contracts.getContract(
      contextB.workspaceId,
      seededB.contract.id,
    );
    expect(reloadedB?.currency).toBe("USD");
  });

  it("never returns or mutates another workspace's invoices", async () => {
    const contextA = await createWorkspaceContext("iso-a");
    const contextB = await createWorkspaceContext("iso-b");
    const seededA = await seedContract(contextA, "iso-a");
    const seededB = await seedContract(contextB, "iso-b");
    const invoiceA = await createInvoice(
      contextA,
      {
        contractId: seededA.contract.id,
        invoiceDate: "2026-09-01",
        amount: "100",
      },
      repositories.contracts,
      repositories.invoices,
    );

    await expect(getInvoice(contextB, invoiceA.id, repositories.invoices)).rejects.toBeInstanceOf(
      InvoiceNotFoundError,
    );
    await expect(
      updateInvoice(contextB, invoiceA.id, { amount: "1" }, repositories.invoices),
    ).rejects.toBeInstanceOf(InvoiceNotFoundError);
    await expect(voidInvoice(contextB, invoiceA.id, repositories.invoices)).rejects.toBeInstanceOf(
      InvoiceNotFoundError,
    );
    await expect(
      createInvoice(
        contextB,
        {
          contractId: seededA.contract.id,
          invoiceDate: "2026-09-02",
          amount: "50",
        },
        repositories.contracts,
        repositories.invoices,
      ),
    ).rejects.toBeInstanceOf(ContractNotFoundError);
    await expect(
      listInvoicesForContract(
        contextB,
        seededA.contract.id,
        repositories.contracts,
        repositories.invoices,
      ),
    ).rejects.toBeInstanceOf(ContractNotFoundError);
    await expect(
      listInvoicesForContract(
        contextB,
        seededB.contract.id,
        repositories.contracts,
        repositories.invoices,
      ),
    ).resolves.toEqual([]);
  });
});
