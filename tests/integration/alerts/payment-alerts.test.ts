// tests/integration/alerts/payment-alerts.test.ts
import { describe, expect, it } from "vitest";

import { evaluateInvoicePaymentAlerts } from "@/application/alerts/evaluate-payment-alerts";
import { createClient } from "@/application/clients/create-client";
import { createContract } from "@/application/contracts/create-contract";
import { createInvoice } from "@/application/invoices/create-invoice";
import { updateInvoice } from "@/application/invoices/update-invoice";
import { voidInvoice } from "@/application/invoices/void-invoice";
import { createPayment } from "@/application/payments/create-payment";
import { deletePayment } from "@/application/payments/delete-payment";
import { updatePayment } from "@/application/payments/update-payment";
import { createFirstWorkspace } from "@/application/workspace/create-first-workspace";
import type { WorkspaceContext } from "@/application/workspace/workspace-context";

import { prisma, repositories, runInTransaction } from "../persistence/helpers";

async function buildContext(suffix: string, timezone = "Europe/Rome") {
  const created = await createFirstWorkspace(
    `p-e03-03-${suffix}`,
    { name: `P-E03-03 ${suffix}`, timezone, currency: "EUR" },
    { runInTransaction },
  );
  return created.context;
}

async function seedInvoice(
  context: WorkspaceContext,
  suffix: string,
  overrides: { amount?: string; invoiceDate?: string; paymentTermsDays?: string | null } = {},
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
      validTo: "2026-12-31",
      billingModel: "HOURLY",
      rate: "80",
      currency: "EUR",
      paymentTermsDays: overrides.paymentTermsDays,
    },
    repositories.clients,
    repositories.contracts,
  );
  const invoice = await createInvoice(
    context,
    {
      contractId: contract.id,
      invoiceDate: overrides.invoiceDate ?? "2026-09-01",
      amount: overrides.amount ?? "1000",
    },
    runInTransaction,
  );

  return { client, contract, invoice };
}

async function activePaymentAlerts(workspaceId: string, invoiceId: string) {
  return prisma.alert.findMany({
    where: { workspaceId, invoiceId, resolvedAt: null },
    orderBy: { type: "asc" },
  });
}

describe("payment alert evaluation and triggers", () => {
  it("creates, deduplicates, resolves, and re-triggers invoice-level payment alerts", async () => {
    const context = await buildContext("lifecycle");
    const { invoice } = await seedInvoice(context, "lifecycle");

    await createPayment(
      context,
      { invoiceId: invoice.id, paymentDate: "2026-09-15", amount: "400" },
      runInTransaction,
    );
    const afterCreate = await activePaymentAlerts(context.workspaceId, invoice.id);
    expect(afterCreate.map((row) => row.type)).toEqual(["PAYMENT_PARTIAL"]);
    expect(afterCreate[0]?.severity).toBe("INFO");

    await createPayment(
      context,
      { invoiceId: invoice.id, paymentDate: "2026-09-16", amount: "100" },
      runInTransaction,
    );
    expect(await activePaymentAlerts(context.workspaceId, invoice.id)).toHaveLength(1);

    const notifications = await prisma.notification.findMany({
      where: { workspaceId: context.workspaceId, alertId: afterCreate[0]?.id },
    });
    expect(notifications).toHaveLength(1);

    const completing = await createPayment(
      context,
      { invoiceId: invoice.id, paymentDate: "2026-09-17", amount: "500" },
      runInTransaction,
    );
    expect(await activePaymentAlerts(context.workspaceId, invoice.id)).toHaveLength(0);

    await deletePayment(context, invoice.id, completing.id, runInTransaction);
    const retriggered = await activePaymentAlerts(context.workspaceId, invoice.id);
    expect(retriggered).toHaveLength(1);
    expect(retriggered[0]?.id).not.toBe(afterCreate[0]?.id);
    expect(retriggered[0]?.type).toBe("PAYMENT_PARTIAL");
    expect(retriggered[0]?.deduplicationKey).toMatch(/:\d+$/);
  });

  it("creates OVERDUE + PARTIAL together and ignores future paymentDate", async () => {
    const context = await buildContext("overdue-partial");
    const { invoice } = await seedInvoice(context, "overdue-partial", {
      invoiceDate: "2026-08-01",
      paymentTermsDays: "30",
    });

    await createPayment(
      context,
      { invoiceId: invoice.id, paymentDate: "2029-01-01", amount: "250" },
      runInTransaction,
    );
    await evaluateInvoicePaymentAlerts(
      context,
      invoice.id,
      repositories,
      new Date("2026-10-15T10:00:00.000Z"),
    );

    const types = (await activePaymentAlerts(context.workspaceId, invoice.id)).map(
      (row) => row.type,
    );
    expect(types).toEqual(expect.arrayContaining(["PAYMENT_OVERDUE", "PAYMENT_PARTIAL"]));
    expect(types).toHaveLength(2);
  });

  it("does not create OVERDUE when dueDate is today or missing", async () => {
    const context = await buildContext("due-edge");
    const withDue = await seedInvoice(context, "due-today", {
      invoiceDate: "2026-09-01",
      paymentTermsDays: "30",
    });
    const withoutDue = await seedInvoice(context, "due-null", {
      paymentTermsDays: null,
    });

    await evaluateInvoicePaymentAlerts(
      context,
      withDue.invoice.id,
      repositories,
      new Date("2026-10-01T10:00:00.000Z"),
    );
    await evaluateInvoicePaymentAlerts(
      context,
      withoutDue.invoice.id,
      repositories,
      new Date("2026-10-15T10:00:00.000Z"),
    );

    expect(await activePaymentAlerts(context.workspaceId, withDue.invoice.id)).toEqual([]);
    expect(await activePaymentAlerts(context.workspaceId, withoutDue.invoice.id)).toEqual([]);
  });

  it("re-evaluates on payment update/delete and invoice amount/date updates", async () => {
    const context = await buildContext("triggers");
    const { invoice } = await seedInvoice(context, "triggers", {
      paymentTermsDays: "30",
    });
    const payment = await createPayment(
      context,
      { invoiceId: invoice.id, paymentDate: "2026-09-15", amount: "400" },
      runInTransaction,
    );

    await updatePayment(
      context,
      invoice.id,
      payment.id,
      { amount: "1200" },
      runInTransaction,
    );
    expect(
      (await activePaymentAlerts(context.workspaceId, invoice.id)).map((row) => row.type),
    ).toEqual(["PAYMENT_MISMATCH"]);

    await deletePayment(context, invoice.id, payment.id, runInTransaction);
    expect(await activePaymentAlerts(context.workspaceId, invoice.id)).toEqual([]);

    await createPayment(
      context,
      { invoiceId: invoice.id, paymentDate: "2026-09-15", amount: "400" },
      runInTransaction,
    );
    await updateInvoice(
      context,
      invoice.id,
      { amount: "400" },
      repositories.invoices,
      runInTransaction,
    );
    expect(await activePaymentAlerts(context.workspaceId, invoice.id)).toEqual([]);

    await updateInvoice(
      context,
      invoice.id,
      { amount: "1000", invoiceDate: "2026-08-01" },
      repositories.invoices,
      runInTransaction,
    );
    await evaluateInvoicePaymentAlerts(
      context,
      invoice.id,
      repositories,
      new Date("2026-10-15T10:00:00.000Z"),
    );
    const types = (await activePaymentAlerts(context.workspaceId, invoice.id)).map(
      (row) => row.type,
    );
    expect(types).toEqual(expect.arrayContaining(["PAYMENT_OVERDUE", "PAYMENT_PARTIAL"]));
    expect(types).toHaveLength(2);

    const beforeReference = await activePaymentAlerts(context.workspaceId, invoice.id);
    await updateInvoice(
      context,
      invoice.id,
      { reference: "NO-EVAL" },
      repositories.invoices,
      runInTransaction,
    );
    const afterReference = await activePaymentAlerts(context.workspaceId, invoice.id);
    expect(afterReference.map((row) => row.id)).toEqual(beforeReference.map((row) => row.id));
  });

  it("resolves every active payment alert on VOID and creates no new ones", async () => {
    const context = await buildContext("void");
    const { invoice } = await seedInvoice(context, "void", {
      invoiceDate: "2026-08-01",
      paymentTermsDays: "30",
    });
    await createPayment(
      context,
      { invoiceId: invoice.id, paymentDate: "2026-09-15", amount: "400" },
      runInTransaction,
    );
    await evaluateInvoicePaymentAlerts(
      context,
      invoice.id,
      repositories,
      new Date("2026-10-15T10:00:00.000Z"),
    );
    expect(await activePaymentAlerts(context.workspaceId, invoice.id)).toHaveLength(2);

    await runInTransaction(async (tx) => {
      await voidInvoice(context, invoice.id, tx.invoices, tx.alerts);
    });

    expect(await activePaymentAlerts(context.workspaceId, invoice.id)).toEqual([]);
    const historical = await prisma.alert.findMany({
      where: { workspaceId: context.workspaceId, invoiceId: invoice.id },
    });
    expect(historical.length).toBeGreaterThan(0);
    expect(historical.every((row) => row.resolvedAt !== null)).toBe(true);

    await evaluateInvoicePaymentAlerts(
      context,
      invoice.id,
      repositories,
      new Date("2026-10-15T10:00:00.000Z"),
    );
    expect(await activePaymentAlerts(context.workspaceId, invoice.id)).toEqual([]);
  });

  it("cannot create duplicate active alerts under concurrent evaluation", async () => {
    const context = await buildContext("race");
    const { invoice } = await seedInvoice(context, "race");
    await repositories.payments.createPayment(context.workspaceId, {
      invoiceId: invoice.id,
      paymentDate: new Date("2026-09-15T00:00:00.000Z"),
      amount: "400.0000",
      currency: "EUR",
    });

    await Promise.all([
      evaluateInvoicePaymentAlerts(context, invoice.id, repositories),
      evaluateInvoicePaymentAlerts(context, invoice.id, repositories),
    ]);

    expect(await activePaymentAlerts(context.workspaceId, invoice.id)).toHaveLength(1);
  });

  it("leaves CONTRACT_* alerts unchanged", async () => {
    const context = await buildContext("contract-reg");
    const { contract, invoice } = await seedInvoice(context, "contract-reg");
    const contractAlert = await repositories.alerts.createAlert(context.workspaceId, {
      type: "CONTRACT_WARNING",
      severity: "WARNING",
      contractId: contract.id,
      periodStart: new Date("2026-09-01T00:00:00.000Z"),
      periodEnd: new Date("2026-10-01T00:00:00.000Z"),
      deduplicationKey: `cw:${context.workspaceId}:${contract.id}:2026-09-01`,
    });

    await createPayment(
      context,
      { invoiceId: invoice.id, paymentDate: "2026-09-15", amount: "400" },
      runInTransaction,
    );

    const persisted = await prisma.alert.findUnique({ where: { id: contractAlert.id } });
    expect(persisted).toMatchObject({
      type: "CONTRACT_WARNING",
      resolvedAt: null,
      invoiceId: null,
    });
  });
});
