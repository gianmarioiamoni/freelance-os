// tests/integration/application/invoices/invoice-concurrency.test.ts
import { describe, expect, it } from "vitest";

import { createClient } from "@/application/clients/create-client";
import { createContract } from "@/application/contracts/create-contract";
import { updateContract } from "@/application/contracts/update-contract";
import { createInvoice } from "@/application/invoices/create-invoice";
import { updateInvoice } from "@/application/invoices/update-invoice";
import { createFirstWorkspace } from "@/application/workspace/create-first-workspace";
import type { WorkspaceContext } from "@/application/workspace/workspace-context";
import { ContractCurrencyImmutableError } from "@/domain/contract-errors";
import { InvoiceNotEditableError } from "@/domain/invoice-errors";

import { date, prisma, repositories, runInTransaction } from "../../persistence/helpers";

const workspaceInput = {
  timezone: "Europe/Rome",
  currency: "EUR",
} as const;

const contractUpdate = {
  validFrom: "2026-01-01",
  validTo: "2026-07-01",
  billingModel: "HOURLY" as const,
  rate: "80",
};

function createHold() {
  let release!: () => void;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  return { held, release };
}

async function waitForLockWaiter(): Promise<void> {
  await new Promise((resolve) => {
    setTimeout(resolve, 50);
  });
}

async function createWorkspaceContext(suffix: string): Promise<WorkspaceContext> {
  const created = await createFirstWorkspace(
    `invoice-race-${suffix}`,
    { ...workspaceInput, name: `Invoice Race ${suffix}` },
    { runInTransaction },
  );

  return created.context;
}

async function seedContract(context: WorkspaceContext, suffix: string) {
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
      validTo: "2026-07-01",
      billingModel: "HOURLY",
      rate: "80",
      currency: "EUR",
    },
    repositories.clients,
    repositories.contracts,
  );

  return contract;
}

describe("invoice concurrency", () => {
  it("rejects a currency change that waits behind an in-flight invoice create", async () => {
    const context = await createWorkspaceContext("ccy-after-create");
    const contract = await seedContract(context, "ccy-after-create");
    const hold = createHold();
    let resolveLocked!: () => void;
    const locked = new Promise<void>((resolve) => {
      resolveLocked = resolve;
    });

    const createSide = runInTransaction(async (tx) => {
      const lockedContract = await tx.contracts.lockContract(
        context.workspaceId,
        contract.id,
      );
      resolveLocked();
      await hold.held;
      return tx.invoices.createInvoice(context.workspaceId, {
        contractId: contract.id,
        invoiceDate: date("2026-09-01"),
        amount: "100.0000",
        currency: lockedContract!.currency,
      });
    });

    await locked;
    const currencySide = updateContract(
      context,
      contract.id,
      { ...contractUpdate, currency: "USD" },
      runInTransaction,
    );
    await waitForLockWaiter();
    hold.release();

    const invoice = await createSide;
    await expect(currencySide).rejects.toBeInstanceOf(ContractCurrencyImmutableError);

    const persisted = await prisma.contract.findUnique({ where: { id: contract.id } });
    expect(invoice.currency).toBe("EUR");
    expect(persisted?.currency).toBe("EUR");
  });

  it("snapshots the currency committed by a locked contract update", async () => {
    const context = await createWorkspaceContext("create-after-ccy");
    const contract = await seedContract(context, "create-after-ccy");
    const hold = createHold();
    let resolveLocked!: () => void;
    const locked = new Promise<void>((resolve) => {
      resolveLocked = resolve;
    });

    const currencySide = runInTransaction(async (tx) => {
      const lockedContract = await tx.contracts.lockContract(
        context.workspaceId,
        contract.id,
      );
      expect(lockedContract?.currency).toBe("EUR");
      resolveLocked();
      await hold.held;
      return tx.contracts.updateContract(context.workspaceId, contract.id, {
        validFrom: date("2026-01-01"),
        validTo: date("2026-07-01"),
        billingModel: "HOURLY",
        rate: "80",
        currency: "USD",
      });
    });

    await locked;
    const createSide = createInvoice(
      context,
      {
        contractId: contract.id,
        invoiceDate: "2026-09-01",
        amount: "100",
      },
      runInTransaction,
    );
    await waitForLockWaiter();
    hold.release();

    await currencySide;
    const invoice = await createSide;
    const persisted = await prisma.contract.findUnique({ where: { id: contract.id } });
    expect(invoice.currency).toBe("USD");
    expect(persisted?.currency).toBe("USD");
  });

  it("rejects an update that waits behind an in-flight VOID", async () => {
    const context = await createWorkspaceContext("void-update");
    const contract = await seedContract(context, "void-update");
    const invoice = await createInvoice(
      context,
      {
        contractId: contract.id,
        invoiceDate: "2026-09-01",
        amount: "100",
      },
      runInTransaction,
    );
    const hold = createHold();
    let resolveLocked!: () => void;
    const locked = new Promise<void>((resolve) => {
      resolveLocked = resolve;
    });

    const voidSide = runInTransaction(async (tx) => {
      const voided = await tx.invoices.voidInvoice(context.workspaceId, invoice.id);
      resolveLocked();
      await hold.held;
      return voided;
    });

    await locked;
    const updateSide = updateInvoice(
      context,
      invoice.id,
      { amount: "9999" },
      repositories.invoices,
    );
    await waitForLockWaiter();
    hold.release();

    await voidSide;
    await expect(updateSide).rejects.toBeInstanceOf(InvoiceNotEditableError);

    const persisted = await prisma.invoice.findUnique({ where: { id: invoice.id } });
    expect(persisted?.voidedAt).not.toBeNull();
    expect(persisted?.amount.toFixed(4)).toBe("100.0000");
  });
});
