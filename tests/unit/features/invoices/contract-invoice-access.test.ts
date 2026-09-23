// tests/unit/features/invoices/contract-invoice-access.test.ts
import { describe, expect, it } from "vitest";

import type { WorkspaceContext } from "@/application/workspace/workspace-context";
import { ContractNotFoundError } from "@/domain/contract-errors";
import { InvoiceNotFoundError } from "@/domain/invoice-errors";
import type {
  ContractRecord,
  InvoiceRecord,
  InvoiceTrackingFilter,
} from "@/domain/persistence-types";
import type { ContractRepository, InvoiceRepository, PaymentRepository } from "@/domain/repositories";
import {
  getInvoiceOnContract,
  listInvoicesOnContract,
} from "@/features/invoices/contract-invoice-access";

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
    allocatedMinutes: null,
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

function repositories(seed: {
  contracts?: ContractRecord[];
  invoices?: InvoiceRecord[];
}) {
  const contracts = seed.contracts ?? [];
  const invoices = seed.invoices ?? [];

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
    async lockInvoice(workspaceId, invoiceId) {
      return invoiceRepository.getInvoice(workspaceId, invoiceId);
    },
    async listInvoicesForContract(workspaceId, contractId, tracking: InvoiceTrackingFilter = "ACTIVE") {
      return invoices.filter((row) => {
        if (row.workspaceId !== workspaceId || row.contractId !== contractId) {
          return false;
        }

        if (tracking === "ALL") {
          return true;
        }

        return tracking === "VOID" ? row.voidedAt !== null : row.voidedAt === null;
      });
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
    async createPayment() {
      throw new Error("not used");
    },
    async getPayment() {
      return null;
    },
    async listPaymentsForInvoice() {
      return [];
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

describe("contract invoice access", () => {
  it("lists invoices for a contract in the current workspace only", async () => {
    const repos = repositories({
      contracts: [contractRecord()],
      invoices: [
        invoiceRecord(),
        invoiceRecord({
          id: "invoice-void",
          voidedAt: calendarDate("2026-09-02"),
        }),
        invoiceRecord({
          id: "invoice-other-contract",
          contractId: "contract-2",
        }),
        invoiceRecord({
          id: "invoice-other-workspace",
          workspaceId: "workspace-b",
        }),
      ],
    });

    const active = await listInvoicesOnContract(
      context,
      "contract-1",
      repos.contracts,
      repos.invoices,
      repos.payments,
    );
    const all = await listInvoicesOnContract(
      context,
      "contract-1",
      repos.contracts,
      repos.invoices,
      repos.payments,
      "ALL",
    );

    expect(active.map((row) => row.id)).toEqual(["invoice-1"]);
    expect(all.map((row) => row.id)).toEqual(["invoice-1", "invoice-void"]);
    expect(active[0]?.amountStatus).toBe("UNPAID");
    expect(active[0]?.currency).toBe("EUR");
  });

  it("rejects invoices that belong to another contract or workspace", async () => {
    const otherContract = contractRecord({ id: "contract-2" });
    const repos = repositories({
      contracts: [contractRecord(), otherContract],
      invoices: [
        invoiceRecord(),
        invoiceRecord({
          id: "invoice-b",
          workspaceId: "workspace-b",
          contractId: "contract-b",
        }),
      ],
    });

    await expect(
      getInvoiceOnContract(
        context,
        "contract-2",
        "invoice-1",
        repos.contracts,
        repos.invoices,
        repos.payments,
      ),
    ).rejects.toBeInstanceOf(InvoiceNotFoundError);
    await expect(
      getInvoiceOnContract(
        context,
        "contract-1",
        "invoice-b",
        repos.contracts,
        repos.invoices,
        repos.payments,
      ),
    ).rejects.toBeInstanceOf(InvoiceNotFoundError);
    await expect(
      getInvoiceOnContract(
        context,
        "missing-contract",
        "invoice-1",
        repos.contracts,
        repos.invoices,
        repos.payments,
      ),
    ).rejects.toBeInstanceOf(ContractNotFoundError);
  });

  it("returns VOID invoices when opened by id on their contract", async () => {
    const repos = repositories({
      contracts: [contractRecord()],
      invoices: [
        invoiceRecord({
          voidedAt: calendarDate("2026-09-02"),
        }),
      ],
    });

    const invoice = await getInvoiceOnContract(
      context,
      "contract-1",
      "invoice-1",
      repos.contracts,
      repos.invoices,
      repos.payments,
    );

    expect(invoice.trackingState).toBe("VOID");
    expect(invoice.amountStatus).toBe("UNPAID");
  });
});
