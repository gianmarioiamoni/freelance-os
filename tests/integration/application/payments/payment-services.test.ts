// tests/integration/application/payments/payment-services.test.ts
import { describe, expect, it } from "vitest";

import { createClient } from "@/application/clients/create-client";
import { createContract } from "@/application/contracts/create-contract";
import { updateContract } from "@/application/contracts/update-contract";
import { createInvoice } from "@/application/invoices/create-invoice";
import { getInvoice } from "@/application/invoices/get-invoice";
import { listInvoicesForContract } from "@/application/invoices/list-invoices-for-contract";
import { voidInvoice } from "@/application/invoices/void-invoice";
import { createPayment } from "@/application/payments/create-payment";
import { deletePayment } from "@/application/payments/delete-payment";
import { getPayment } from "@/application/payments/get-payment";
import { listPaymentsForInvoice } from "@/application/payments/list-payments-for-invoice";
import { updatePayment } from "@/application/payments/update-payment";
import { createFirstWorkspace } from "@/application/workspace/create-first-workspace";
import type { WorkspaceContext } from "@/application/workspace/workspace-context";
import {
  InvoiceNotEditableError,
  InvoiceNotFoundError,
} from "@/domain/invoice-errors";
import {
  InvalidPaymentInputError,
  PaymentNotFoundError,
} from "@/domain/payment-errors";

import { date, prisma, repositories, runInTransaction } from "../../persistence/helpers";

const workspaceInput = {
  timezone: "Europe/Rome",
  currency: "EUR",
} as const;

async function createWorkspaceContext(suffix: string): Promise<WorkspaceContext> {
  const created = await createFirstWorkspace(
    `payment-app-${suffix}`,
    { ...workspaceInput, name: `Payment ${suffix}` },
    { runInTransaction },
  );

  return created.context;
}

async function seedInvoice(
  context: WorkspaceContext,
  suffix: string,
  overrides: {
    amount?: string;
    invoiceDate?: string;
    paymentTermsDays?: string | null;
    currency?: string;
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
      validTo: "2026-07-01",
      billingModel: "HOURLY",
      rate: "80",
      currency: overrides.currency ?? "EUR",
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
      amount: overrides.amount ?? "1500.0000",
    },
    runInTransaction,
  );

  return { client, contract, invoice };
}

describe("payment application services", () => {
  it("creates, lists, updates, and deletes payments with Invoice currency authority", async () => {
    const context = await createWorkspaceContext("crud");
    const { contract, invoice } = await seedInvoice(context, "crud");

    const created = await createPayment(
      context,
      {
        invoiceId: invoice.id,
        paymentDate: "2026-09-15",
        amount: "250.5",
        notes: "wire",
      },
      runInTransaction,
    );

    expect(created).toMatchObject({
      workspaceId: context.workspaceId,
      invoiceId: invoice.id,
      amount: "250.5000",
      currency: "EUR",
      notes: "wire",
    });
    expect(created.paymentDate).toEqual(date("2026-09-15"));

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
      runInTransaction,
    );

    const loaded = await getPayment(
      context,
      invoice.id,
      created.id,
      repositories.invoices,
      repositories.payments,
    );
    expect(loaded.currency).toBe("EUR");

    const updated = await updatePayment(
      context,
      invoice.id,
      created.id,
      { paymentDate: "2026-09-20", amount: "275.25", notes: "updated" },
      runInTransaction,
    );
    expect(updated).toMatchObject({
      invoiceId: invoice.id,
      amount: "275.2500",
      currency: "EUR",
      notes: "updated",
    });

    await deletePayment(context, invoice.id, created.id, runInTransaction);
    await expect(
      getPayment(
        context,
        invoice.id,
        created.id,
        repositories.invoices,
        repositories.payments,
      ),
    ).rejects.toBeInstanceOf(PaymentNotFoundError);
  });

  it("rejects currency mismatch and does not read Contract.currency", async () => {
    const context = await createWorkspaceContext("ccy");
    const { contract, invoice } = await seedInvoice(context, "ccy");

    await expect(
      createPayment(
        context,
        {
          invoiceId: invoice.id,
          paymentDate: "2026-09-15",
          amount: "100",
          currency: "USD",
        },
        runInTransaction,
      ),
    ).rejects.toBeInstanceOf(InvalidPaymentInputError);

    const payment = await createPayment(
      context,
      {
        invoiceId: invoice.id,
        paymentDate: "2026-09-15",
        amount: "100",
        currency: "EUR",
      },
      runInTransaction,
    );

    expect(payment.currency).toBe(invoice.currency);
    expect(payment.currency).toBe("EUR");
    expect(contract.currency).toBe("EUR");
  });

  it("sums multiple payments and derives PAID, PARTIAL, MISMATCH, and UNPAID", async () => {
    const context = await createWorkspaceContext("sum");
    const { invoice } = await seedInvoice(context, "sum", { amount: "1000.0000" });
    const now = new Date("2026-09-22T10:00:00.000Z");

    const unpaid = await getInvoice(
      context,
      invoice.id,
      repositories.invoices,
      repositories.payments,
      now,
    );
    expect(unpaid).toMatchObject({
      paidAmount: "0",
      amountStatus: "UNPAID",
    });

    await createPayment(
      context,
      { invoiceId: invoice.id, paymentDate: "2026-09-10", amount: "400" },
      runInTransaction,
    );
    await createPayment(
      context,
      { invoiceId: invoice.id, paymentDate: "2026-09-11", amount: "200" },
      runInTransaction,
    );

    const partial = await getInvoice(
      context,
      invoice.id,
      repositories.invoices,
      repositories.payments,
      now,
    );
    const listed = await listInvoicesForContract(
      context,
      invoice.contractId,
      repositories.contracts,
      repositories.invoices,
      repositories.payments,
      "ACTIVE",
      now,
    );
    expect(partial).toMatchObject({
      paidAmount: "600.0000",
      amountStatus: "PARTIAL",
    });
    expect(listed[0]).toMatchObject({
      id: invoice.id,
      paidAmount: "600.0000",
      amountStatus: "PARTIAL",
    });

    await createPayment(
      context,
      { invoiceId: invoice.id, paymentDate: "2026-09-12", amount: "400" },
      runInTransaction,
    );
    const paid = await getInvoice(
      context,
      invoice.id,
      repositories.invoices,
      repositories.payments,
      now,
    );
    expect(paid.amountStatus).toBe("PAID");

    await createPayment(
      context,
      { invoiceId: invoice.id, paymentDate: "2026-09-13", amount: "1" },
      runInTransaction,
    );
    const mismatch = await getInvoice(
      context,
      invoice.id,
      repositories.invoices,
      repositories.payments,
      now,
    );
    expect(mismatch).toMatchObject({
      paidAmount: "1001.0000",
      amountStatus: "MISMATCH",
    });

    const persisted = await prisma.invoice.findUnique({ where: { id: invoice.id } });
    expect(persisted).not.toHaveProperty("paidAmount");
    expect(persisted).not.toHaveProperty("amountStatus");
  });

  it("allows partial and overdue at the same time", async () => {
    const context = await createWorkspaceContext("overdue");
    const { invoice } = await seedInvoice(context, "overdue", {
      amount: "1000.0000",
      invoiceDate: "2026-09-01",
      paymentTermsDays: "0",
    });

    await createPayment(
      context,
      { invoiceId: invoice.id, paymentDate: "2026-09-02", amount: "200" },
      runInTransaction,
    );

    const view = await getInvoice(
      context,
      invoice.id,
      repositories.invoices,
      repositories.payments,
      new Date("2026-09-22T00:30:00.000Z"),
    );

    expect(view).toMatchObject({
      paidAmount: "200.0000",
      amountStatus: "PARTIAL",
      overdue: true,
    });
  });

  it("keeps VOID payments readable and excludes VOID from the active list", async () => {
    const context = await createWorkspaceContext("void-read");
    const { invoice } = await seedInvoice(context, "void-read");
    const payment = await createPayment(
      context,
      { invoiceId: invoice.id, paymentDate: "2026-09-15", amount: "80" },
      runInTransaction,
    );

    await voidInvoice(context, invoice.id, repositories.invoices);

    await expect(
      createPayment(
        context,
        { invoiceId: invoice.id, paymentDate: "2026-09-16", amount: "10" },
        runInTransaction,
      ),
    ).rejects.toBeInstanceOf(InvoiceNotEditableError);
    await expect(
      updatePayment(context, invoice.id, payment.id, { amount: "90" }, runInTransaction),
    ).rejects.toBeInstanceOf(InvoiceNotEditableError);
    await expect(
      deletePayment(context, invoice.id, payment.id, runInTransaction),
    ).rejects.toBeInstanceOf(InvoiceNotEditableError);

    const listed = await listPaymentsForInvoice(
      context,
      invoice.id,
      repositories.invoices,
      repositories.payments,
    );
    const historical = await getInvoice(
      context,
      invoice.id,
      repositories.invoices,
      repositories.payments,
    );
    const active = await listInvoicesForContract(
      context,
      invoice.contractId,
      repositories.contracts,
      repositories.invoices,
      repositories.payments,
    );

    expect(listed).toEqual([expect.objectContaining({ id: payment.id, amount: "80.0000" })]);
    expect(historical).toMatchObject({
      trackingState: "VOID",
      paidAmount: "80.0000",
      amountStatus: "PARTIAL",
    });
    expect(active).toEqual([]);
    expect(await prisma.payment.findUnique({ where: { id: payment.id } })).not.toBeNull();
  });

  it("never returns or mutates another workspace's payments", async () => {
    const contextA = await createWorkspaceContext("iso-a");
    const contextB = await createWorkspaceContext("iso-b");
    const seededA = await seedInvoice(contextA, "iso-a");
    const seededB = await seedInvoice(contextB, "iso-b");
    const paymentA = await createPayment(
      contextA,
      { invoiceId: seededA.invoice.id, paymentDate: "2026-09-15", amount: "40" },
      runInTransaction,
    );

    await expect(
      createPayment(
        contextB,
        { invoiceId: seededA.invoice.id, paymentDate: "2026-09-16", amount: "10" },
        runInTransaction,
      ),
    ).rejects.toBeInstanceOf(InvoiceNotFoundError);
    await expect(
      getPayment(
        contextB,
        seededA.invoice.id,
        paymentA.id,
        repositories.invoices,
        repositories.payments,
      ),
    ).rejects.toBeInstanceOf(InvoiceNotFoundError);
    await expect(
      listPaymentsForInvoice(
        contextB,
        seededA.invoice.id,
        repositories.invoices,
        repositories.payments,
      ),
    ).rejects.toBeInstanceOf(InvoiceNotFoundError);
    await expect(
      updatePayment(
        contextB,
        seededA.invoice.id,
        paymentA.id,
        { amount: "1" },
        runInTransaction,
      ),
    ).rejects.toBeInstanceOf(InvoiceNotFoundError);
    await expect(
      deletePayment(contextB, seededA.invoice.id, paymentA.id, runInTransaction),
    ).rejects.toBeInstanceOf(InvoiceNotFoundError);
    await expect(
      listPaymentsForInvoice(
        contextB,
        seededB.invoice.id,
        repositories.invoices,
        repositories.payments,
      ),
    ).resolves.toEqual([]);
  });
});
