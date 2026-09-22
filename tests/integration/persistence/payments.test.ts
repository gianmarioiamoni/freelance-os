// tests/integration/persistence/payments.test.ts
import { describe, expect, it } from "vitest";

import {
  ConstraintViolationError,
  ForeignKeyViolationError,
  RecordNotFoundError,
} from "@/domain/persistence-errors";

import { createWorkspaceGraph } from "./fixtures";
import { date, prisma, repositories, runInTransaction } from "./helpers";

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

async function createInvoiceOnGraph(
  workspaceId: string,
  contractId: string,
  overrides: {
    invoiceDate?: Date;
    amount?: string;
    currency?: string;
  } = {},
) {
  return repositories.invoices.createInvoice(workspaceId, {
    contractId,
    invoiceDate: overrides.invoiceDate ?? date("2026-09-01"),
    amount: overrides.amount ?? "1500.0000",
    currency: overrides.currency ?? "EUR",
  });
}

async function createPaymentOnInvoice(
  workspaceId: string,
  invoiceId: string,
  overrides: {
    paymentDate?: Date;
    amount?: string;
    currency?: string;
    notes?: string | null;
  } = {},
) {
  return repositories.payments.createPayment(workspaceId, {
    invoiceId,
    paymentDate: overrides.paymentDate ?? date("2026-09-15"),
    amount: overrides.amount ?? "250.5000",
    currency: overrides.currency ?? "EUR",
    notes: overrides.notes,
  });
}

describe("payment persistence", () => {
  it("creates and reads a payment bound to a workspace invoice", async () => {
    const graph = await createWorkspaceGraph(repositories, "pay-create");
    const invoice = await createInvoiceOnGraph(graph.workspaceId, graph.contractId);

    const created = await createPaymentOnInvoice(graph.workspaceId, invoice.id, {
      notes: "wire",
    });
    const loaded = await repositories.payments.getPayment(graph.workspaceId, created.id);

    expect(loaded).toMatchObject({
      id: created.id,
      workspaceId: graph.workspaceId,
      invoiceId: invoice.id,
      amount: "250.5000",
      currency: "EUR",
      notes: "wire",
    });
    expect(loaded?.paymentDate).toEqual(date("2026-09-15"));
    expect(loaded?.createdAt).toBeInstanceOf(Date);
    expect(loaded?.updatedAt).toBeInstanceOf(Date);
    expect(
      await repositories.payments.listPaymentsForInvoice(graph.workspaceId, invoice.id),
    ).toEqual([expect.objectContaining({ id: created.id })]);
  });

  it("persists optional notes as null and keeps Decimal(19,4) scale", async () => {
    const graph = await createWorkspaceGraph(repositories, "pay-scale");
    const invoice = await createInvoiceOnGraph(graph.workspaceId, graph.contractId);
    const created = await createPaymentOnInvoice(graph.workspaceId, invoice.id, {
      amount: "123456789012345.1234",
    });

    expect(created.notes).toBeNull();
    expect(created.amount).toBe("123456789012345.1234");
  });

  it("persists Payment.currency independently of later Contract currency edits", async () => {
    const graph = await createWorkspaceGraph(repositories, "pay-ccy");
    const invoice = await createInvoiceOnGraph(graph.workspaceId, graph.contractId, {
      currency: "EUR",
    });
    const payment = await createPaymentOnInvoice(graph.workspaceId, invoice.id, {
      currency: "EUR",
    });

    await repositories.contracts.updateContract(graph.workspaceId, graph.contractId, {
      validFrom: date("2026-01-01"),
      validTo: date("2026-07-01"),
      billingModel: "HOURLY",
      rate: "80.0000",
      currency: "USD",
    });

    const persisted = await repositories.payments.getPayment(graph.workspaceId, payment.id);
    const contract = await repositories.contracts.getContract(
      graph.workspaceId,
      graph.contractId,
    );

    expect(contract?.currency).toBe("USD");
    expect(persisted?.currency).toBe("EUR");
    expect(invoice.currency).toBe("EUR");
  });

  it("does not read Contract.currency when persisting a payment", async () => {
    const graph = await createWorkspaceGraph(repositories, "pay-no-fx");
    const invoice = await createInvoiceOnGraph(graph.workspaceId, graph.contractId, {
      currency: "EUR",
    });

    const payment = await createPaymentOnInvoice(graph.workspaceId, invoice.id, {
      currency: "USD",
    });
    const columns = await prisma.$queryRaw<
      Array<{ column_name: string }>
    >`SELECT column_name FROM information_schema.columns WHERE table_name = 'Payment'`;

    expect(payment.currency).toBe("USD");
    expect(columns.map((column) => column.column_name).sort()).toEqual([
      "amount",
      "createdAt",
      "currency",
      "id",
      "invoiceId",
      "notes",
      "paymentDate",
      "updatedAt",
      "workspaceId",
    ]);
  });

  it("stores CHAR(3) currency and DATE paymentDate", async () => {
    const graph = await createWorkspaceGraph(repositories, "pay-types");
    const invoice = await createInvoiceOnGraph(graph.workspaceId, graph.contractId);
    const payment = await createPaymentOnInvoice(graph.workspaceId, invoice.id, {
      paymentDate: new Date("2026-09-15T15:30:00.000Z"),
      currency: "EUR",
    });
    const columns = await prisma.$queryRaw<
      Array<{
        column_name: string;
        data_type: string;
        character_maximum_length: number | null;
        numeric_precision: number | null;
        numeric_scale: number | null;
      }>
    >`
      SELECT column_name, data_type, character_maximum_length, numeric_precision, numeric_scale
      FROM information_schema.columns
      WHERE table_name = 'Payment'
        AND column_name IN ('amount', 'currency', 'paymentDate')
      ORDER BY column_name
    `;

    expect(payment.paymentDate).toEqual(date("2026-09-15"));
    expect(columns).toEqual([
      expect.objectContaining({
        column_name: "amount",
        data_type: "numeric",
        numeric_precision: 19,
        numeric_scale: 4,
      }),
      expect.objectContaining({
        column_name: "currency",
        data_type: "character",
        character_maximum_length: 3,
      }),
      expect.objectContaining({
        column_name: "paymentDate",
        data_type: "date",
      }),
    ]);
  });

  it("rejects non-positive amounts", async () => {
    const graph = await createWorkspaceGraph(repositories, "pay-amt");
    const invoice = await createInvoiceOnGraph(graph.workspaceId, graph.contractId);

    await expect(
      createPaymentOnInvoice(graph.workspaceId, invoice.id, { amount: "0" }),
    ).rejects.toBeInstanceOf(ConstraintViolationError);

    await expect(
      createPaymentOnInvoice(graph.workspaceId, invoice.id, { amount: "-10.0000" }),
    ).rejects.toBeInstanceOf(ConstraintViolationError);
  });

  it("updates amount, date, and notes without moving invoiceId or currency", async () => {
    const graph = await createWorkspaceGraph(repositories, "pay-upd");
    const invoice = await createInvoiceOnGraph(graph.workspaceId, graph.contractId);
    const payment = await createPaymentOnInvoice(graph.workspaceId, invoice.id, {
      notes: "keep",
    });

    const updated = await repositories.payments.updatePayment(graph.workspaceId, payment.id, {
      paymentDate: date("2026-09-20"),
      amount: "275.2500",
      notes: "updated",
    });

    expect(updated).toMatchObject({
      id: payment.id,
      workspaceId: graph.workspaceId,
      invoiceId: invoice.id,
      amount: "275.2500",
      currency: "EUR",
      notes: "updated",
    });
    expect(updated.paymentDate).toEqual(date("2026-09-20"));
    expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(payment.updatedAt.getTime());
  });

  it("deletes a workspace-scoped payment and rejects a missing row", async () => {
    const graph = await createWorkspaceGraph(repositories, "pay-del");
    const invoice = await createInvoiceOnGraph(graph.workspaceId, graph.contractId);
    const payment = await createPaymentOnInvoice(graph.workspaceId, invoice.id);

    await repositories.payments.deletePayment(graph.workspaceId, payment.id);

    expect(await repositories.payments.getPayment(graph.workspaceId, payment.id)).toBeNull();
    await expect(
      repositories.payments.deletePayment(graph.workspaceId, payment.id),
    ).rejects.toBeInstanceOf(RecordNotFoundError);
  });

  it("does not expose workspace A payments through workspace B operations", async () => {
    const workspaceA = await createWorkspaceGraph(repositories, "pay-iso-a");
    const workspaceB = await createWorkspaceGraph(repositories, "pay-iso-b");
    const invoice = await createInvoiceOnGraph(workspaceA.workspaceId, workspaceA.contractId);
    const payment = await createPaymentOnInvoice(workspaceA.workspaceId, invoice.id);

    expect(await repositories.payments.getPayment(workspaceB.workspaceId, payment.id)).toBeNull();
    expect(
      await repositories.payments.listPaymentsForInvoice(workspaceB.workspaceId, invoice.id),
    ).toEqual([]);
    expect(await repositories.invoices.lockInvoice(workspaceB.workspaceId, invoice.id)).toBeNull();

    await expect(
      repositories.payments.updatePayment(workspaceB.workspaceId, payment.id, {
        amount: "1.0000",
      }),
    ).rejects.toBeInstanceOf(RecordNotFoundError);

    await expect(
      repositories.payments.deletePayment(workspaceB.workspaceId, payment.id),
    ).rejects.toBeInstanceOf(RecordNotFoundError);

    expect(
      await repositories.payments.getPayment(workspaceA.workspaceId, payment.id),
    ).toMatchObject({ id: payment.id, workspaceId: workspaceA.workspaceId });
  });

  it("rejects a cross-workspace invoice association", async () => {
    const workspaceA = await createWorkspaceGraph(repositories, "pay-fk-a");
    const workspaceB = await createWorkspaceGraph(repositories, "pay-fk-b");
    const invoiceA = await createInvoiceOnGraph(workspaceA.workspaceId, workspaceA.contractId);

    await expect(
      createPaymentOnInvoice(workspaceB.workspaceId, invoiceA.id),
    ).rejects.toBeInstanceOf(ForeignKeyViolationError);
  });

  it("keeps existing payments readable after Invoice VOID and does not cascade-delete", async () => {
    const graph = await createWorkspaceGraph(repositories, "pay-void");
    const invoice = await createInvoiceOnGraph(graph.workspaceId, graph.contractId);
    const payment = await createPaymentOnInvoice(graph.workspaceId, invoice.id, {
      notes: "history",
    });

    const voided = await repositories.invoices.voidInvoice(graph.workspaceId, invoice.id);
    const stillPresent = await prisma.payment.findUnique({ where: { id: payment.id } });

    expect(voided.voidedAt).not.toBeNull();
    expect(stillPresent).not.toBeNull();
    expect(
      await repositories.payments.getPayment(graph.workspaceId, payment.id),
    ).toMatchObject({ id: payment.id, notes: "history" });
    expect(
      await repositories.payments.listPaymentsForInvoice(graph.workspaceId, invoice.id),
    ).toEqual([expect.objectContaining({ id: payment.id })]);
    expect(await repositories.invoices.getInvoice(graph.workspaceId, invoice.id)).toMatchObject({
      id: invoice.id,
      voidedAt: expect.any(Date),
    });
  });

  it("restricts hard-deleting an invoice that still has payments", async () => {
    const graph = await createWorkspaceGraph(repositories, "pay-restrict");
    const invoice = await createInvoiceOnGraph(graph.workspaceId, graph.contractId);
    const payment = await createPaymentOnInvoice(graph.workspaceId, invoice.id);

    await expect(prisma.invoice.delete({ where: { id: invoice.id } })).rejects.toThrow();

    expect(await prisma.payment.findUnique({ where: { id: payment.id } })).not.toBeNull();
    expect(await prisma.invoice.findUnique({ where: { id: invoice.id } })).not.toBeNull();
  });

  it("exposes unique (workspaceId, id) and (workspaceId, invoiceId) query paths", async () => {
    const graph = await createWorkspaceGraph(repositories, "pay-idx");
    const invoice = await createInvoiceOnGraph(graph.workspaceId, graph.contractId);
    const first = await createPaymentOnInvoice(graph.workspaceId, invoice.id, {
      paymentDate: date("2026-09-10"),
      amount: "10.0000",
    });
    const second = await createPaymentOnInvoice(graph.workspaceId, invoice.id, {
      paymentDate: date("2026-09-11"),
      amount: "20.0000",
    });

    const indexes = await prisma.$queryRaw<Array<{ indexname: string }>>`
      SELECT indexname FROM pg_indexes WHERE tablename = 'Payment' ORDER BY indexname
    `;

    expect(indexes.map((index) => index.indexname)).toEqual(
      expect.arrayContaining([
        "Payment_pkey",
        "Payment_workspaceId_id_key",
        "Payment_workspaceId_invoiceId_idx",
      ]),
    );
    expect(
      await repositories.payments.listPaymentsForInvoice(graph.workspaceId, invoice.id),
    ).toEqual([
      expect.objectContaining({ id: first.id }),
      expect.objectContaining({ id: second.id }),
    ]);
  });

  it("lockInvoice is workspace-scoped and holds the row while a VOID waits", async () => {
    const graph = await createWorkspaceGraph(repositories, "pay-lock");
    const invoice = await createInvoiceOnGraph(graph.workspaceId, graph.contractId);
    const hold = createHold();
    let resolveLocked!: () => void;
    const locked = new Promise<void>((resolve) => {
      resolveLocked = resolve;
    });

    const lockSide = runInTransaction(async (tx) => {
      const lockedInvoice = await tx.invoices.lockInvoice(graph.workspaceId, invoice.id);
      expect(lockedInvoice?.voidedAt).toBeNull();
      const payment = await tx.payments.createPayment(graph.workspaceId, {
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
    const voidSide = repositories.invoices.voidInvoice(graph.workspaceId, invoice.id);
    await waitForLockWaiter();
    hold.release();

    const payment = await lockSide;
    const voided = await voidSide;

    expect(payment.invoiceId).toBe(invoice.id);
    expect(voided.voidedAt).not.toBeNull();
    expect(await repositories.payments.getPayment(graph.workspaceId, payment.id)).toMatchObject({
      id: payment.id,
    });
    expect(await repositories.invoices.lockInvoice(graph.workspaceId, invoice.id)).toMatchObject({
      id: invoice.id,
      voidedAt: expect.any(Date),
    });
  });
});
