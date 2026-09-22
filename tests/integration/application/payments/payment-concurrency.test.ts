// tests/integration/application/payments/payment-concurrency.test.ts
import { describe, expect, it } from "vitest";

import { createClient } from "@/application/clients/create-client";
import { createContract } from "@/application/contracts/create-contract";
import { createInvoice } from "@/application/invoices/create-invoice";
import { voidInvoice } from "@/application/invoices/void-invoice";
import { createPayment } from "@/application/payments/create-payment";
import { deletePayment } from "@/application/payments/delete-payment";
import { updatePayment } from "@/application/payments/update-payment";
import { createFirstWorkspace } from "@/application/workspace/create-first-workspace";
import type { WorkspaceContext } from "@/application/workspace/workspace-context";
import { InvoiceNotEditableError } from "@/domain/invoice-errors";

import { date, prisma, repositories, runInTransaction } from "../../persistence/helpers";

const workspaceInput = {
  timezone: "Europe/Rome",
  currency: "EUR",
} as const;

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
    `payment-race-${suffix}`,
    { ...workspaceInput, name: `Payment Race ${suffix}` },
    { runInTransaction },
  );

  return created.context;
}

async function seedInvoice(context: WorkspaceContext, suffix: string) {
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

  return createInvoice(
    context,
    {
      contractId: contract.id,
      invoiceDate: "2026-09-01",
      amount: "1500",
    },
    runInTransaction,
  );
}

describe("payment concurrency", () => {
  it("rejects a create that waits behind an in-flight VOID", async () => {
    const context = await createWorkspaceContext("void-create");
    const invoice = await seedInvoice(context, "void-create");
    const hold = createHold();
    let resolveLocked!: () => void;
    const locked = new Promise<void>((resolve) => {
      resolveLocked = resolve;
    });

    const voidSide = runInTransaction(async (tx) => {
      const voided = await voidInvoice(context, invoice.id, tx.invoices, tx.alerts);
      resolveLocked();
      await hold.held;
      return voided;
    });

    await locked;
    const createSide = createPayment(
      context,
      { invoiceId: invoice.id, paymentDate: "2026-09-15", amount: "40" },
      runInTransaction,
    );
    await waitForLockWaiter();
    hold.release();

    await voidSide;
    await expect(createSide).rejects.toBeInstanceOf(InvoiceNotEditableError);

    const persisted = await prisma.invoice.findUnique({ where: { id: invoice.id } });
    expect(persisted?.voidedAt).not.toBeNull();
    expect(await prisma.payment.count({ where: { invoiceId: invoice.id } })).toBe(0);
  });

  it("lets VOID proceed after a winning payment create", async () => {
    const context = await createWorkspaceContext("create-void");
    const invoice = await seedInvoice(context, "create-void");
    const hold = createHold();
    let resolveLocked!: () => void;
    const locked = new Promise<void>((resolve) => {
      resolveLocked = resolve;
    });

    const createSide = runInTransaction(async (tx) => {
      const lockedInvoice = await tx.invoices.lockInvoice(context.workspaceId, invoice.id);
      const payment = await tx.payments.createPayment(context.workspaceId, {
        invoiceId: invoice.id,
        paymentDate: date("2026-09-15"),
        amount: "40.0000",
        currency: lockedInvoice!.currency,
      });
      resolveLocked();
      await hold.held;
      return payment;
    });

    await locked;
    const voidSide = runInTransaction(async (tx) =>
      voidInvoice(context, invoice.id, tx.invoices, tx.alerts),
    );
    await waitForLockWaiter();
    hold.release();

    const payment = await createSide;
    const voided = await voidSide;

    expect(payment.invoiceId).toBe(invoice.id);
    expect(voided.voidedAt).not.toBeNull();
    expect(await prisma.payment.findUnique({ where: { id: payment.id } })).not.toBeNull();
  });

  it("rejects an update that waits behind an in-flight VOID", async () => {
    const context = await createWorkspaceContext("void-update");
    const invoice = await seedInvoice(context, "void-update");
    const payment = await createPayment(
      context,
      { invoiceId: invoice.id, paymentDate: "2026-09-15", amount: "40" },
      runInTransaction,
    );
    const hold = createHold();
    let resolveLocked!: () => void;
    const locked = new Promise<void>((resolve) => {
      resolveLocked = resolve;
    });

    const voidSide = runInTransaction(async (tx) => {
      const voided = await voidInvoice(context, invoice.id, tx.invoices, tx.alerts);
      resolveLocked();
      await hold.held;
      return voided;
    });

    await locked;
    const updateSide = updatePayment(
      context,
      invoice.id,
      payment.id,
      { amount: "99" },
      runInTransaction,
    );
    await waitForLockWaiter();
    hold.release();

    await voidSide;
    await expect(updateSide).rejects.toBeInstanceOf(InvoiceNotEditableError);

    const persisted = await prisma.payment.findUnique({ where: { id: payment.id } });
    expect(persisted?.amount.toFixed(4)).toBe("40.0000");
  });

  it("rejects a delete that waits behind an in-flight VOID", async () => {
    const context = await createWorkspaceContext("void-delete");
    const invoice = await seedInvoice(context, "void-delete");
    const payment = await createPayment(
      context,
      { invoiceId: invoice.id, paymentDate: "2026-09-15", amount: "40" },
      runInTransaction,
    );
    const hold = createHold();
    let resolveLocked!: () => void;
    const locked = new Promise<void>((resolve) => {
      resolveLocked = resolve;
    });

    const voidSide = runInTransaction(async (tx) => {
      const voided = await voidInvoice(context, invoice.id, tx.invoices, tx.alerts);
      resolveLocked();
      await hold.held;
      return voided;
    });

    await locked;
    const deleteSide = deletePayment(context, invoice.id, payment.id, runInTransaction);
    await waitForLockWaiter();
    hold.release();

    await voidSide;
    await expect(deleteSide).rejects.toBeInstanceOf(InvoiceNotEditableError);
    expect(await prisma.payment.findUnique({ where: { id: payment.id } })).not.toBeNull();
  });
});
