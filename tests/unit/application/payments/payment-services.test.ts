// tests/unit/application/payments/payment-services.test.ts
import { describe, expect, it } from "vitest";

import { getInvoice } from "@/application/invoices/get-invoice";
import { createPayment } from "@/application/payments/create-payment";
import { deletePayment } from "@/application/payments/delete-payment";
import { getPayment } from "@/application/payments/get-payment";
import { listPaymentsForInvoice } from "@/application/payments/list-payments-for-invoice";
import { updatePayment } from "@/application/payments/update-payment";
import type { WorkspaceContext } from "@/application/workspace/workspace-context";
import {
  InvoiceNotEditableError,
  InvoiceNotFoundError,
} from "@/domain/invoice-errors";
import {
  InvalidPaymentInputError,
  PaymentNotFoundError,
} from "@/domain/payment-errors";
import type {
  CreatePaymentInput,
  InvoiceRecord,
  PaymentRecord,
  UpdatePaymentInput,
} from "@/domain/persistence-types";
import type {
  InvoiceRepository,
  PaymentRepository,
  PersistenceRepositories,
  RunInTransaction,
} from "@/domain/repositories";

const context: WorkspaceContext = {
  workspaceId: "workspace-trusted",
  userId: "user-1",
  role: "OWNER",
  timezone: "Europe/Rome",
};

function calendarDate(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

function invoiceRecord(overrides: Partial<InvoiceRecord> = {}): InvoiceRecord {
  return {
    id: "invoice-1",
    workspaceId: context.workspaceId,
    contractId: "contract-1",
    invoiceDate: calendarDate("2026-09-01"),
    amount: "1500.0000",
    currency: "EUR",
    reference: "INV-1",
    paymentTermsDays: 30,
    dueDate: calendarDate("2026-10-01"),
    voidedAt: null,
    createdAt: calendarDate("2026-09-01"),
    updatedAt: calendarDate("2026-09-01"),
    ...overrides,
  };
}

function paymentRecord(overrides: Partial<PaymentRecord> = {}): PaymentRecord {
  return {
    id: "payment-1",
    workspaceId: context.workspaceId,
    invoiceId: "invoice-1",
    paymentDate: calendarDate("2026-09-15"),
    amount: "250.5000",
    currency: "EUR",
    notes: null,
    createdAt: calendarDate("2026-09-15"),
    updatedAt: calendarDate("2026-09-15"),
    ...overrides,
  };
}

const validCreateInput = {
  invoiceId: "invoice-1",
  paymentDate: "2026-09-15",
  amount: "250.5",
};

function createFakeRepositories(
  seedInvoices: InvoiceRecord[] = [],
  seedPayments: PaymentRecord[] = [],
) {
  const invoices = [...seedInvoices];
  const payments = [...seedPayments];
  const calls: {
    lockInvoice?: { workspaceId: string; invoiceId: string };
    create?: { workspaceId: string; input: CreatePaymentInput };
    update?: { workspaceId: string; paymentId: string; input: UpdatePaymentInput };
    delete?: { workspaceId: string; paymentId: string };
    contractLock?: boolean;
  } = {};

  const invoiceRepository: InvoiceRepository = {
    async createInvoice() {
      throw new Error("not used");
    },
    async getInvoice(workspaceId, invoiceId) {
      return (
        invoices.find((row) => row.id === invoiceId && row.workspaceId === workspaceId) ??
        null
      );
    },
    async lockInvoice(workspaceId, invoiceId) {
      calls.lockInvoice = { workspaceId, invoiceId };
      return invoiceRepository.getInvoice(workspaceId, invoiceId);
    },
    async listInvoicesForContract() {
      return [];
    },
    async updateInvoice() {
      throw new Error("not used");
    },
    async voidInvoice() {
      throw new Error("not used");
    },
    async existsForContract() {
      return false;
    },
  };

  const paymentRepository: PaymentRepository = {
    async createPayment(workspaceId, input) {
      calls.create = { workspaceId, input };
      const record = paymentRecord({
        id: `payment-${payments.length + 1}`,
        workspaceId,
        invoiceId: input.invoiceId,
        paymentDate: input.paymentDate,
        amount: input.amount,
        currency: input.currency,
        notes: input.notes ?? null,
      });
      payments.push(record);
      return record;
    },
    async getPayment(workspaceId, paymentId) {
      return (
        payments.find((row) => row.id === paymentId && row.workspaceId === workspaceId) ??
        null
      );
    },
    async listPaymentsForInvoice(workspaceId, invoiceId) {
      return payments.filter(
        (row) => row.workspaceId === workspaceId && row.invoiceId === invoiceId,
      );
    },
    async updatePayment(workspaceId, paymentId, input) {
      calls.update = { workspaceId, paymentId, input };
      const index = payments.findIndex(
        (row) => row.id === paymentId && row.workspaceId === workspaceId,
      );

      if (index === -1) {
        throw new Error("missing payment");
      }

      const current = payments[index];
      const updated = paymentRecord({
        ...current,
        paymentDate: input.paymentDate ?? current.paymentDate,
        amount: input.amount ?? current.amount,
        notes: input.notes === undefined ? current.notes : input.notes,
      });
      payments[index] = updated;
      return updated;
    },
    async deletePayment(workspaceId, paymentId) {
      calls.delete = { workspaceId, paymentId };
      const index = payments.findIndex(
        (row) => row.id === paymentId && row.workspaceId === workspaceId,
      );

      if (index === -1) {
        throw new Error("missing payment");
      }

      payments.splice(index, 1);
    },
  };

  return {
    invoices,
    payments,
    calls,
    invoiceRepository,
    paymentRepository,
    runInTransaction: (async (work) =>
      work({
        invoices: invoiceRepository,
        payments: paymentRepository,
        contracts: {
          lockContract: async () => {
            calls.contractLock = true;
            return null;
          },
        },
      } as unknown as PersistenceRepositories)) as RunInTransaction,
  };
}

describe("payment application services", () => {
  it("creates a payment from Invoice.currency without locking Contract", async () => {
    const fake = createFakeRepositories([invoiceRecord()]);

    const created = await createPayment(
      context,
      { ...validCreateInput, currency: "eur", notes: "wire" },
      fake.runInTransaction,
    );

    expect(created).toMatchObject({
      workspaceId: "workspace-trusted",
      invoiceId: "invoice-1",
      amount: "250.5",
      currency: "EUR",
      notes: "wire",
    });
    expect(fake.calls.create).toMatchObject({
      workspaceId: "workspace-trusted",
      input: { currency: "EUR", invoiceId: "invoice-1" },
    });
    expect(fake.calls.lockInvoice).toEqual({
      workspaceId: "workspace-trusted",
      invoiceId: "invoice-1",
    });
    expect(fake.calls.contractLock).toBeUndefined();
  });

  it("rejects VOID writes and currency mismatch", async () => {
    const fake = createFakeRepositories([
      invoiceRecord(),
      invoiceRecord({
        id: "invoice-void",
        voidedAt: new Date("2026-09-22T10:00:00.000Z"),
      }),
    ]);

    await expect(
      createPayment(
        context,
        { ...validCreateInput, invoiceId: "invoice-void" },
        fake.runInTransaction,
      ),
    ).rejects.toBeInstanceOf(InvoiceNotEditableError);
    await expect(
      createPayment(
        context,
        { ...validCreateInput, currency: "USD" },
        fake.runInTransaction,
      ),
    ).rejects.toMatchObject({ name: "InvalidPaymentInputError", field: "currency" });
    await expect(
      createPayment(context, validCreateInput, fake.runInTransaction),
    ).resolves.toMatchObject({ currency: "EUR" });
    expect(fake.payments).toHaveLength(1);
  });

  it("updates and deletes only ACTIVE invoice payments", async () => {
    const fake = createFakeRepositories(
      [invoiceRecord()],
      [paymentRecord({ notes: "keep" })],
    );

    const updated = await updatePayment(
      context,
      "invoice-1",
      "payment-1",
      { paymentDate: "2026-09-20", amount: "275.25", notes: "updated" },
      fake.runInTransaction,
    );

    expect(updated).toMatchObject({
      invoiceId: "invoice-1",
      amount: "275.25",
      currency: "EUR",
      notes: "updated",
    });
    await expect(
      updatePayment(
        context,
        "invoice-1",
        "payment-1",
        { amount: "10", currency: "USD" },
        fake.runInTransaction,
      ),
    ).rejects.toBeInstanceOf(InvalidPaymentInputError);
    await deletePayment(context, "invoice-1", "payment-1", fake.runInTransaction);
    expect(fake.payments).toHaveLength(0);
  });

  it("rejects VOID update/delete and keeps the payment readable", async () => {
    const fake = createFakeRepositories(
      [
        invoiceRecord({
          voidedAt: new Date("2026-09-22T10:00:00.000Z"),
        }),
      ],
      [paymentRecord({ notes: "history" })],
    );

    await expect(
      updatePayment(context, "invoice-1", "payment-1", { amount: "10" }, fake.runInTransaction),
    ).rejects.toBeInstanceOf(InvoiceNotEditableError);
    await expect(
      deletePayment(context, "invoice-1", "payment-1", fake.runInTransaction),
    ).rejects.toBeInstanceOf(InvoiceNotEditableError);
    await expect(
      getPayment(
        context,
        "invoice-1",
        "payment-1",
        fake.invoiceRepository,
        fake.paymentRepository,
      ),
    ).resolves.toMatchObject({ id: "payment-1", notes: "history" });
    await expect(
      listPaymentsForInvoice(
        context,
        "invoice-1",
        fake.invoiceRepository,
        fake.paymentRepository,
      ),
    ).resolves.toEqual([expect.objectContaining({ id: "payment-1" })]);
    expect(fake.calls.update).toBeUndefined();
    expect(fake.calls.delete).toBeUndefined();
  });

  it("does not treat invoiceId or paymentId as a tenant grant", async () => {
    const fake = createFakeRepositories(
      [invoiceRecord({ id: "invoice-foreign", workspaceId: "workspace-other" })],
      [
        paymentRecord({
          id: "payment-foreign",
          workspaceId: "workspace-other",
          invoiceId: "invoice-foreign",
        }),
      ],
    );

    await expect(
      createPayment(
        context,
        { ...validCreateInput, invoiceId: "invoice-foreign" },
        fake.runInTransaction,
      ),
    ).rejects.toBeInstanceOf(InvoiceNotFoundError);
    await expect(
      getPayment(
        context,
        "invoice-foreign",
        "payment-foreign",
        fake.invoiceRepository,
        fake.paymentRepository,
      ),
    ).rejects.toBeInstanceOf(InvoiceNotFoundError);
    await expect(
      listPaymentsForInvoice(
        context,
        "invoice-foreign",
        fake.invoiceRepository,
        fake.paymentRepository,
      ),
    ).rejects.toBeInstanceOf(InvoiceNotFoundError);
    await expect(
      updatePayment(
        context,
        "invoice-foreign",
        "payment-foreign",
        { amount: "1" },
        fake.runInTransaction,
      ),
    ).rejects.toBeInstanceOf(InvoiceNotFoundError);
    await expect(
      deletePayment(context, "invoice-foreign", "payment-foreign", fake.runInTransaction),
    ).rejects.toBeInstanceOf(InvoiceNotFoundError);
  });

  it("rejects a payment that does not belong to the indicated invoice", async () => {
    const fake = createFakeRepositories(
      [invoiceRecord(), invoiceRecord({ id: "invoice-2" })],
      [paymentRecord()],
    );

    await expect(
      getPayment(
        context,
        "invoice-2",
        "payment-1",
        fake.invoiceRepository,
        fake.paymentRepository,
      ),
    ).rejects.toBeInstanceOf(PaymentNotFoundError);
    await expect(
      updatePayment(context, "invoice-2", "payment-1", { amount: "10" }, fake.runInTransaction),
    ).rejects.toBeInstanceOf(PaymentNotFoundError);
  });

  it("wires invoice paidAmount from the payment SUM", async () => {
    const fake = createFakeRepositories(
      [invoiceRecord()],
      [
        paymentRecord({ id: "payment-1", amount: "500.0000" }),
        paymentRecord({ id: "payment-2", amount: "1000.0000" }),
      ],
    );

    await expect(
      getInvoice(
        context,
        "invoice-1",
        fake.invoiceRepository,
        fake.paymentRepository,
        new Date("2026-09-22T10:00:00.000Z"),
      ),
    ).resolves.toMatchObject({
      paidAmount: "1500.0000",
      amountStatus: "PAID",
      overdue: false,
    });
  });
});
