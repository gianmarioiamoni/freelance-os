// tests/unit/application/invoices/workspace-invoice-service.test.ts
import { WorkspaceInvoiceService } from "@/application/invoices/workspace-invoice-service";
import type { WorkspaceContext } from "@/application/workspace/workspace-context";
import { ClientNotFoundError } from "@/domain/client-errors";
import type {
  ClientRecord,
  ContractRecord,
  InvoiceRecord,
  PaymentRecord,
} from "@/domain/persistence-types";
import type {
  ClientRepository,
  ContractRepository,
  InvoiceRepository,
  InvoiceWorkspaceListRecord,
  PaymentRepository,
} from "@/domain/repositories";
import { beforeEach, describe, expect, it } from "vitest";

describe("WorkspaceInvoiceService", () => {
  let service: WorkspaceInvoiceService;
  let mockInvoices: InvoiceRepository;
  let mockPayments: PaymentRepository;
  let mockClients: ClientRepository;
  let mockContracts: ContractRepository;
  let context: WorkspaceContext;
  let listed: InvoiceWorkspaceListRecord[];
  let payments: PaymentRecord[];

  beforeEach(() => {
    context = {
      workspaceId: "workspace-1",
      userId: "user-1",
      role: "OWNER",
      timezone: "Europe/Rome",
    };
    listed = [];
    payments = [];

    mockInvoices = {
      listInvoicesForWorkspace: async () => listed,
    } as unknown as InvoiceRepository;

    mockPayments = {
      listPaymentsForInvoice: async () => [],
      listPaymentsForInvoices: async (
        _workspaceId: string,
        invoiceIds: readonly string[],
      ) => {
        const idSet = new Set(invoiceIds);
        return payments.filter((row) => idSet.has(row.invoiceId));
      },
    } as unknown as PaymentRepository;

    mockClients = {
      getClient: async (_workspaceId: string, clientId: string) =>
        clientId === "client-1" ? clientRecord() : null,
    } as unknown as ClientRepository;

    mockContracts = {
      getContract: async (_workspaceId: string, contractId: string) =>
        contractId === "contract-1" ? contractRecord() : null,
    } as unknown as ContractRepository;

    service = new WorkspaceInvoiceService(
      mockInvoices,
      mockPayments,
      mockClients,
      mockContracts,
    );
  });

  describe("getWorkspaceInvoiceSummary", () => {
    it("returns zero amounts for empty workspace", async () => {
      const summary = await service.getWorkspaceInvoiceSummary(context);

      expect(summary.invoicedByCurrency).toEqual([]);
      expect(summary.paidByCurrency).toEqual([]);
      expect(summary.outstandingByCurrency).toEqual([]);
      expect(summary.overdueCount).toBe(0);
    });

    it("separates EUR and USD invoiced amounts", async () => {
      listed = [
        listRecord("inv-1", "1000.5000", "EUR"),
        listRecord("inv-2", "2000.0000", "EUR"),
        listRecord("inv-3", "500.0000", "USD"),
      ];

      const summary = await service.getWorkspaceInvoiceSummary(context);

      expect(summary.invoicedByCurrency).toEqual([
        { currency: "EUR", amount: "3000.5000" },
        { currency: "USD", amount: "500.0000" },
      ]);
    });

    it("computes paid and outstanding per currency via batched payments", async () => {
      listed = [
        listRecord("inv-1", "1000.0000", "EUR"),
        listRecord("inv-2", "500.0000", "USD"),
      ];
      payments = [
        createPayment("pay-1", "inv-1", "600.0000", "EUR"),
        createPayment("pay-2", "inv-2", "200.0000", "USD"),
      ];

      const summary = await service.getWorkspaceInvoiceSummary(context);

      expect(summary.paidByCurrency).toEqual([
        { currency: "EUR", amount: "600.0000" },
        { currency: "USD", amount: "200.0000" },
      ]);
      expect(summary.outstandingByCurrency).toEqual([
        { currency: "EUR", amount: "400.0000" },
        { currency: "USD", amount: "300.0000" },
      ]);
    });

    it("requests ACTIVE tracking for summary aggregates", async () => {
      mockInvoices.listInvoicesForWorkspace = async (_workspaceId, filter) => {
        expect(filter?.tracking).toBe("ACTIVE");
        return [];
      };

      await service.getWorkspaceInvoiceSummary(context);
    });
  });

  describe("listInvoicesForWorkspace", () => {
    it("returns empty list for empty workspace", async () => {
      await expect(service.listInvoicesForWorkspace(context)).resolves.toEqual([]);
    });

    it("returns derived payment status and client identity", async () => {
      listed = [listRecord("inv-1", "1000.0000", "EUR")];
      payments = [createPayment("pay-1", "inv-1", "400.0000", "EUR")];

      const rows = await service.listInvoicesForWorkspace(context);

      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({
        id: "inv-1",
        clientId: "client-1",
        clientName: "Client A",
        paidAmount: "400.0000",
        amountStatus: "PARTIAL",
        currency: "EUR",
        amount: "1000.0000",
      });
    });

    it("supports unpaid, paid, and mismatch statuses", async () => {
      listed = [
        listRecord("inv-unpaid", "100.0000", "EUR"),
        listRecord("inv-paid", "100.0000", "EUR"),
        listRecord("inv-mismatch", "100.0000", "EUR"),
      ];
      payments = [
        createPayment("p1", "inv-paid", "100.0000", "EUR"),
        createPayment("p2", "inv-mismatch", "150.0000", "EUR"),
      ];

      const rows = await service.listInvoicesForWorkspace(context);
      const byId = Object.fromEntries(rows.map((row) => [row.id, row.amountStatus]));

      expect(byId).toEqual({
        "inv-unpaid": "UNPAID",
        "inv-paid": "PAID",
        "inv-mismatch": "MISMATCH",
      });
    });

    it("filters by amountStatus using existing derived semantics", async () => {
      listed = [
        listRecord("inv-unpaid", "100.0000", "EUR"),
        listRecord("inv-paid", "100.0000", "EUR"),
      ];
      payments = [createPayment("p1", "inv-paid", "100.0000", "EUR")];

      const rows = await service.listInvoicesForWorkspace(context, {
        amountStatus: "PAID",
      });

      expect(rows.map((row) => row.id)).toEqual(["inv-paid"]);
    });

    it("rejects client from another workspace", async () => {
      await expect(
        service.listInvoicesForWorkspace(context, { clientId: "foreign-client" }),
      ).rejects.toBeInstanceOf(ClientNotFoundError);
    });

    it("passes period, tracking, and client filters to repository", async () => {
      const period = {
        startDate: new Date("2026-01-01"),
        endDate: new Date("2026-01-31"),
      };

      mockInvoices.listInvoicesForWorkspace = async (_workspaceId, filter) => {
        expect(filter).toEqual({
          tracking: "VOID",
          period,
          clientId: "client-1",
          contractId: "contract-1",
        });
        return [];
      };

      await service.listInvoicesForWorkspace(context, {
        tracking: "VOID",
        period,
        clientId: "client-1",
        contractId: "contract-1",
      });
    });

    it("defaults tracking to ACTIVE", async () => {
      mockInvoices.listInvoicesForWorkspace = async (_workspaceId, filter) => {
        expect(filter?.tracking).toBe("ACTIVE");
        return [];
      };

      await service.listInvoicesForWorkspace(context);
    });
  });
});

function listRecord(
  id: string,
  amount: string,
  currency: string,
  overrides: Partial<InvoiceWorkspaceListRecord> = {},
): InvoiceWorkspaceListRecord {
  return {
    ...createInvoice(id, amount, currency),
    clientId: "client-1",
    clientName: "Client A",
    ...overrides,
  };
}

function createInvoice(
  id: string,
  amount: string,
  currency: string,
): InvoiceRecord {
  return {
    id,
    workspaceId: "workspace-1",
    contractId: "contract-1",
    invoiceDate: new Date("2026-01-15"),
    amount,
    currency,
    reference: null,
    paymentTermsDays: 30,
    dueDate: new Date("2026-02-14"),
    voidedAt: null,
    createdAt: new Date("2026-01-15T10:00:00Z"),
    updatedAt: new Date("2026-01-15T10:00:00Z"),
  };
}

function createPayment(
  id: string,
  invoiceId: string,
  amount: string,
  currency: string,
): PaymentRecord {
  return {
    id,
    workspaceId: "workspace-1",
    invoiceId,
    paymentDate: new Date("2026-01-20"),
    amount,
    currency,
    notes: null,
    createdAt: new Date("2026-01-20T10:00:00Z"),
    updatedAt: new Date("2026-01-20T10:00:00Z"),
  };
}

function clientRecord(): ClientRecord {
  return {
    id: "client-1",
    workspaceId: "workspace-1",
    companyName: "Client A",
    vatNumber: null,
    taxCode: null,
    address: null,
    contactName: null,
    email: null,
    phone: null,
    notes: null,
    status: "ACTIVE",
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
  };
}

function contractRecord(): ContractRecord {
  return {
    id: "contract-1",
    workspaceId: "workspace-1",
    clientId: "client-1",
    validFrom: new Date("2026-01-01"),
    validTo: null,
    billingModel: "HOURLY",
    rate: "100.0000",
    currency: "EUR",
    monthlyContractedMinutes: 9600,
    allocatedMinutes: null,
    paymentTermsDays: 30,
    paymentTermsNote: null,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
  };
}
