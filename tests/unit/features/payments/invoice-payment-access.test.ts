// tests/unit/features/payments/invoice-payment-access.test.ts
import { describe, expect, it } from "vitest";

import type { WorkspaceContext } from "@/application/workspace/workspace-context";
import { ContractNotFoundError } from "@/domain/contract-errors";
import { InvoiceNotFoundError } from "@/domain/invoice-errors";
import { PaymentNotFoundError } from "@/domain/payment-errors";
import type {
  ContractRecord,
  InvoiceRecord,
  PaymentRecord,
} from "@/domain/persistence-types";
import type {
  ContractRepository,
  InvoiceRepository,
  PaymentRepository,
} from "@/domain/repositories";
import {
  getPaymentOnInvoice,
  listPaymentsOnInvoice,
} from "@/features/payments/invoice-payment-access";

const context: WorkspaceContext = {
  workspaceId: "workspace-a",
  userId: "user-1",
  role: "OWNER",
  timezone: "Europe/Rome",
};

function calendarDate(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

function contractRecord(overrides: Partial<ContractRecord> = {}): ContractRecord {
  return {
    id: "contract-1",
    workspaceId: context.workspaceId,
    clientId: "client-1",
    validFrom: calendarDate("2026-01-01"),
    validTo: null,
    billingModel: "HOURLY",
    rate: "80",
    currency: "EUR",
    monthlyContractedMinutes: null,
    paymentTermsDays: 30,
    paymentTermsNote: null,
    createdAt: calendarDate("2026-01-01"),
    updatedAt: calendarDate("2026-01-01"),
    ...overrides,
  };
}

function invoiceRecord(overrides: Partial<InvoiceRecord> = {}): InvoiceRecord {
  return {
    id: "invoice-1",
    workspaceId: context.workspaceId,
    contractId: "contract-1",
    invoiceDate: calendarDate("2026-09-01"),
    amount: "1500",
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
    amount: "400",
    currency: "EUR",
    notes: "First",
    createdAt: calendarDate("2026-09-15"),
    updatedAt: calendarDate("2026-09-15"),
    ...overrides,
  };
}

function repositories(seed: {
  contracts?: ContractRecord[];
  invoices?: InvoiceRecord[];
  payments?: PaymentRecord[];
}) {
  const contracts = seed.contracts ?? [];
  const invoices = seed.invoices ?? [];
  const payments = seed.payments ?? [];

  const contractRepository: ContractRepository = {
    async createContract() {
      throw new Error("not used");
    },
    async getContract(workspaceId, contractId) {
      return (
        contracts.find(
          (row) => row.id === contractId && row.workspaceId === workspaceId,
        ) ?? null
      );
    },
    async listContracts() {
      return [];
    },
    async listContractsForClient() {
      return [];
    },
    async updateContract() {
      throw new Error("not used");
    },
    async findContractCoveringDate() {
      return null;
    },
    async lockContract(workspaceId, contractId) {
      return contractRepository.getContract(workspaceId, contractId);
    },
  };

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
    async listInvoicesForContract(workspaceId, contractId) {
      return invoices.filter(
        (row) => row.workspaceId === workspaceId && row.contractId === contractId,
      );
    },
    async updateInvoice() {
      throw new Error("not used");
    },
    async voidInvoice() {
      throw new Error("not used");
    },
    async lockInvoice(workspaceId, invoiceId) {
      return (
        invoices.find((row) => row.id === invoiceId && row.workspaceId === workspaceId) ??
        null
      );
    },
    async existsForContract() {
      return false;
    },
  };

  const paymentRepository: PaymentRepository = {
    async createPayment() {
      throw new Error("not used");
    },
    async getPayment(workspaceId, paymentId) {
      return (
        payments.find((row) => row.id === paymentId && row.workspaceId === workspaceId) ??
        null
      );
    },
    async listPaymentsForInvoice(workspaceId, invoiceId) {
      return payments
        .filter((row) => row.workspaceId === workspaceId && row.invoiceId === invoiceId)
        .sort((left, right) => {
          const dateCompare = left.paymentDate.getTime() - right.paymentDate.getTime();
          return dateCompare !== 0
            ? dateCompare
            : left.createdAt.getTime() - right.createdAt.getTime();
        });
    },
    async updatePayment() {
      throw new Error("not used");
    },
    async deletePayment() {
      throw new Error("not used");
    },
  };

  return {
    contracts: contractRepository,
    invoices: invoiceRepository,
    payments: paymentRepository,
  };
}

describe("invoice payment access", () => {
  it("lists payments for the invoice in deterministic repository order", async () => {
    const repos = repositories({
      contracts: [contractRecord()],
      invoices: [invoiceRecord()],
      payments: [
        paymentRecord({
          id: "payment-later-date",
          paymentDate: calendarDate("2026-09-20"),
          createdAt: calendarDate("2026-09-10"),
          amount: "200",
        }),
        paymentRecord({
          id: "payment-earlier-date",
          paymentDate: calendarDate("2026-09-10"),
          createdAt: calendarDate("2026-09-20"),
          amount: "100",
          notes: "Earlier",
        }),
        paymentRecord({
          id: "payment-other-invoice",
          invoiceId: "invoice-2",
        }),
        paymentRecord({
          id: "payment-other-workspace",
          workspaceId: "workspace-b",
        }),
      ],
    });

    const listed = await listPaymentsOnInvoice(
      context,
      "contract-1",
      "invoice-1",
      repos.contracts,
      repos.invoices,
      repos.payments,
    );

    expect(listed.map((row) => row.id)).toEqual([
      "payment-earlier-date",
      "payment-later-date",
    ]);
    expect(listed[0]?.notes).toBe("Earlier");
    expect(listed[0]?.currency).toBe("EUR");
  });

  it("rejects payments that belong to another invoice, contract, or workspace", async () => {
    const repos = repositories({
      contracts: [contractRecord(), contractRecord({ id: "contract-2" })],
      invoices: [
        invoiceRecord(),
        invoiceRecord({
          id: "invoice-2",
          contractId: "contract-2",
        }),
      ],
      payments: [
        paymentRecord(),
        paymentRecord({
          id: "payment-foreign",
          workspaceId: "workspace-b",
          invoiceId: "invoice-foreign",
        }),
      ],
    });

    await expect(
      listPaymentsOnInvoice(
        context,
        "contract-2",
        "invoice-1",
        repos.contracts,
        repos.invoices,
        repos.payments,
      ),
    ).rejects.toBeInstanceOf(InvoiceNotFoundError);
    await expect(
      getPaymentOnInvoice(
        context,
        "contract-1",
        "invoice-2",
        "payment-1",
        repos.contracts,
        repos.invoices,
        repos.payments,
      ),
    ).rejects.toBeInstanceOf(InvoiceNotFoundError);
    await expect(
      getPaymentOnInvoice(
        context,
        "contract-1",
        "invoice-1",
        "payment-foreign",
        repos.contracts,
        repos.invoices,
        repos.payments,
      ),
    ).rejects.toBeInstanceOf(PaymentNotFoundError);
    await expect(
      listPaymentsOnInvoice(
        context,
        "missing-contract",
        "invoice-1",
        repos.contracts,
        repos.invoices,
        repos.payments,
      ),
    ).rejects.toBeInstanceOf(ContractNotFoundError);
  });

  it("keeps VOID invoice payment history readable", async () => {
    const repos = repositories({
      contracts: [contractRecord()],
      invoices: [invoiceRecord({ voidedAt: calendarDate("2026-09-22") })],
      payments: [paymentRecord({ amount: "250", notes: "Before void" })],
    });

    const listed = await listPaymentsOnInvoice(
      context,
      "contract-1",
      "invoice-1",
      repos.contracts,
      repos.invoices,
      repos.payments,
    );
    const payment = await getPaymentOnInvoice(
      context,
      "contract-1",
      "invoice-1",
      "payment-1",
      repos.contracts,
      repos.invoices,
      repos.payments,
    );

    expect(listed).toHaveLength(1);
    expect(listed[0]?.notes).toBe("Before void");
    expect(payment.amount).toBe("250");
  });
});
