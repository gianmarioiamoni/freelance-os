// tests/integration/features/invoices/contract-invoice-access.test.ts
import { describe, expect, it } from "vitest";

import { createClient } from "@/application/clients/create-client";
import { createContract } from "@/application/contracts/create-contract";
import { createInvoice } from "@/application/invoices/create-invoice";
import { updateInvoice } from "@/application/invoices/update-invoice";
import { voidInvoice } from "@/application/invoices/void-invoice";
import { createFirstWorkspace } from "@/application/workspace/create-first-workspace";
import type { WorkspaceContext } from "@/application/workspace/workspace-context";
import { ContractNotFoundError } from "@/domain/contract-errors";
import { InvoiceNotFoundError } from "@/domain/invoice-errors";
import {
  getInvoiceOnContract,
  listInvoicesOnContract,
} from "@/features/invoices/contract-invoice-access";
import {
  formatInvoiceAmount,
  formatInvoiceAmountStatus,
  formatInvoiceDueDate,
  formatInvoiceOverdue,
  formatInvoiceTrackingState,
} from "@/features/invoices/invoice-display";

import { repositories, runInTransaction } from "../../persistence/helpers";

const workspaceInput = {
  timezone: "Europe/Rome",
  currency: "EUR",
} as const;

async function createWorkspaceContext(suffix: string): Promise<WorkspaceContext> {
  const created = await createFirstWorkspace(
    `invoice-ui-${suffix}`,
    { ...workspaceInput, name: `Invoice UI ${suffix}` },
    { runInTransaction },
  );

  return created.context;
}

async function seedContract(
  context: WorkspaceContext,
  suffix: string,
  paymentTermsDays?: string | null,
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
      billingModel: "HOURLY",
      rate: "80",
      currency: "EUR",
      paymentTermsDays,
    },
    repositories.clients,
    repositories.contracts,
  );

  return { client, contract };
}

describe("contract-scoped invoice UI access", () => {
  it("creates, updates, voids, and filters invoices on one contract", async () => {
    const context = await createWorkspaceContext("crud");
    const { contract } = await seedContract(context, "crud", "30");
    const now = new Date("2026-09-22T10:00:00.000Z");

    const created = await createInvoice(context,
      {
        contractId: contract.id,
        invoiceDate: "2026-08-01",
        amount: "1500.25",
        reference: "INV-UI-1",
      }, runInTransaction);

    const listed = await listInvoicesOnContract(
      context,
      contract.id,
      repositories.contracts,
      repositories.invoices,
      repositories.payments,
      "ACTIVE",
      now,
    );
    expect(listed).toHaveLength(1);
    expect(formatInvoiceAmount(listed[0]!.amount, listed[0]!.currency)).toBe(
      "1500.25 EUR",
    );
    expect(formatInvoiceAmountStatus(listed[0]!.amountStatus)).toBe("Unpaid");
    expect(formatInvoiceDueDate(listed[0]!.dueDate)).toBe("2026-08-31");
    expect(formatInvoiceOverdue(listed[0]!.overdue)).toBe("Overdue");

    const updated = await updateInvoice(
      context,
      created.id,
      { invoiceDate: "2026-09-20", amount: "1750", reference: "INV-UI-1B" },
      repositories.invoices,
    );
    const afterUpdate = await getInvoiceOnContract(
      context,
      contract.id,
      updated.id,
      repositories.contracts,
      repositories.invoices,
      repositories.payments,
      now,
    );
    expect(formatInvoiceDueDate(afterUpdate.dueDate)).toBe("2026-10-20");
    expect(formatInvoiceOverdue(afterUpdate.overdue)).toBeNull();

    await voidInvoice(context, created.id, repositories.invoices);

    const active = await listInvoicesOnContract(
      context,
      contract.id,
      repositories.contracts,
      repositories.invoices,
      repositories.payments,
    );
    const voided = await listInvoicesOnContract(
      context,
      contract.id,
      repositories.contracts,
      repositories.invoices,
      repositories.payments,
      "VOID",
    );
    const all = await listInvoicesOnContract(
      context,
      contract.id,
      repositories.contracts,
      repositories.invoices,
      repositories.payments,
      "ALL",
    );
    const detail = await getInvoiceOnContract(
      context,
      contract.id,
      created.id,
      repositories.contracts,
      repositories.invoices,
      repositories.payments,
    );

    expect(active).toEqual([]);
    expect(voided).toHaveLength(1);
    expect(all).toHaveLength(1);
    expect(formatInvoiceTrackingState(detail.trackingState)).toBe("Void");
  });

  it("hides invoices from another workspace and another contract", async () => {
    const contextA = await createWorkspaceContext("iso-a");
    const contextB = await createWorkspaceContext("iso-b");
    const seededA = await seedContract(contextA, "iso-a", "0");
    const otherContract = await seedContract(contextA, "iso-a-other", null);
    const seededB = await seedContract(contextB, "iso-b");
    const invoiceA = await createInvoice(contextA,
      {
        contractId: seededA.contract.id,
        invoiceDate: "2026-09-01",
        amount: "100",
      }, runInTransaction);

    await expect(
      getInvoiceOnContract(
        contextB,
        seededA.contract.id,
        invoiceA.id,
        repositories.contracts,
        repositories.invoices,
        repositories.payments,
      ),
    ).rejects.toBeInstanceOf(ContractNotFoundError);
    await expect(
      getInvoiceOnContract(
        contextB,
        seededB.contract.id,
        invoiceA.id,
        repositories.contracts,
        repositories.invoices,
        repositories.payments,
      ),
    ).rejects.toBeInstanceOf(InvoiceNotFoundError);
    await expect(
      getInvoiceOnContract(
        contextA,
        otherContract.contract.id,
        invoiceA.id,
        repositories.contracts,
        repositories.invoices,
        repositories.payments,
      ),
    ).rejects.toBeInstanceOf(InvoiceNotFoundError);
    await expect(
      listInvoicesOnContract(
        contextB,
        seededA.contract.id,
        repositories.contracts,
        repositories.invoices,
        repositories.payments,
      ),
    ).rejects.toBeInstanceOf(ContractNotFoundError);

    const noTerms = await createInvoice(contextA,
      {
        contractId: otherContract.contract.id,
        invoiceDate: "2026-09-01",
        amount: "50",
      }, runInTransaction);
    const viewed = await getInvoiceOnContract(
      contextA,
      otherContract.contract.id,
      noTerms.id,
      repositories.contracts,
      repositories.invoices,
      repositories.payments,
    );

    expect(viewed.dueDate).toBeNull();
    expect(viewed.overdue).toBe(false);
    expect(viewed.currency).toBe("EUR");
  });
});
