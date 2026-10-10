// tests/unit/application/invoices/annual-invoice-report.test.ts
import {
  AnnualInvoiceReportService,
  AnnualReportError,
} from "@/application/invoices/annual-invoice-report";
import type { WorkspaceContext } from "@/application/workspace/workspace-context";
import type {
  InvoiceRecord,
  PaymentRecord,
} from "@/domain/persistence-types";
import type {
  InvoiceRepository,
  InvoiceWorkspaceListRecord,
  PaymentRepository,
  WorkspaceInvoiceFilter,
} from "@/domain/repositories";
import { beforeEach, describe, expect, it } from "vitest";

describe("AnnualInvoiceReportService", () => {
  let service: AnnualInvoiceReportService;
  let mockInvoices: InvoiceRepository;
  let mockPayments: PaymentRepository;
  let context: WorkspaceContext;
  let listedInvoices: InvoiceWorkspaceListRecord[];
  let listedPayments: PaymentRecord[];

  beforeEach(() => {
    context = {
      workspaceId: "workspace-1",
      userId: "user-1",
      role: "OWNER",
      timezone: "Europe/Rome",
    };
    listedInvoices = [];
    listedPayments = [];

    mockInvoices = {
      listInvoicesForWorkspace: async (_workspaceId: string, filter?: WorkspaceInvoiceFilter) => {
        let filtered = [...listedInvoices];
        
        // Apply period filter if provided
        if (filter?.period) {
          filtered = filtered.filter(
            (inv) =>
              inv.invoiceDate >= filter.period!.startDate &&
              inv.invoiceDate <= filter.period!.endDate,
          );
        }
        
        return filtered;
      },
    } as unknown as InvoiceRepository;

    mockPayments = {
      listPaymentsForInvoices: async (
        _workspaceId: string,
        invoiceIds: readonly string[],
      ) => {
        const idSet = new Set(invoiceIds);
        return listedPayments.filter((row) => idSet.has(row.invoiceId));
      },
    } as unknown as PaymentRepository;

    service = new AnnualInvoiceReportService(mockInvoices, mockPayments);
  });

  describe("getAnnualInvoiceReport", () => {
    it("rejects invalid year", async () => {
      await expect(service.getAnnualInvoiceReport(context, 1999)).rejects.toThrow(
        AnnualReportError,
      );
      await expect(service.getAnnualInvoiceReport(context, 2101)).rejects.toThrow(
        AnnualReportError,
      );
      await expect(
        service.getAnnualInvoiceReport(context, 2025.5 as unknown as number),
      ).rejects.toThrow(AnnualReportError);
    });

    it("returns empty report for year with no data", async () => {
      const report = await service.getAnnualInvoiceReport(context, 2026);

      expect(report.year).toBe(2026);
      expect(report.period.startDate).toEqual(new Date("2026-01-01T00:00:00Z"));
      expect(report.period.endDate).toEqual(new Date("2026-12-31T00:00:00Z"));
      expect(report.invoices).toEqual([]);
      expect(report.payments).toEqual([]);
      expect(report.totalCollectedByCurrency).toEqual([]);
    });

    it("includes invoices issued in the year", async () => {
      listedInvoices = [
        createListRecord(
          "inv-1",
          new Date("2026-03-15"),
          "REF-001",
          "1000.0000",
          "EUR",
        ),
        createListRecord(
          "inv-2",
          new Date("2026-06-20"),
          "REF-002",
          "500.0000",
          "USD",
        ),
      ];

      const report = await service.getAnnualInvoiceReport(context, 2026);

      expect(report.invoices).toHaveLength(2);
      expect(report.invoices[0]).toEqual({
        invoiceId: "inv-1",
        invoiceDate: new Date("2026-03-15"),
        reference: "REF-001",
        clientName: "Client A",
        amount: "1000.0000",
        currency: "EUR",
      });
    });

    it("excludes invoices outside the year", async () => {
      listedInvoices = [
        createListRecord(
          "inv-2025",
          new Date("2025-12-31"),
          "OLD",
          "100.0000",
          "EUR",
        ),
        createListRecord(
          "inv-2026",
          new Date("2026-01-01"),
          "NEW",
          "200.0000",
          "EUR",
        ),
        createListRecord(
          "inv-2027",
          new Date("2027-01-01"),
          "FUTURE",
          "300.0000",
          "EUR",
        ),
      ];

      const report = await service.getAnnualInvoiceReport(context, 2026);

      expect(report.invoices).toHaveLength(1);
      expect(report.invoices[0].invoiceId).toBe("inv-2026");
    });

    it("includes payments collected in the year regardless of invoice date", async () => {
      listedInvoices = [
        createListRecord(
          "inv-2025",
          new Date("2025-11-01"),
          "OLD",
          "1000.0000",
          "EUR",
        ),
        createListRecord(
          "inv-2026",
          new Date("2026-02-01"),
          "NEW",
          "500.0000",
          "EUR",
        ),
      ];

      listedPayments = [
        createPayment(
          "pay-1",
          "inv-2025",
          new Date("2026-01-15"),
          "600.0000",
          "EUR",
        ),
        createPayment(
          "pay-2",
          "inv-2026",
          new Date("2026-03-01"),
          "200.0000",
          "EUR",
        ),
      ];

      const report = await service.getAnnualInvoiceReport(context, 2026);

      // Only inv-2026 issued in 2026
      expect(report.invoices).toHaveLength(1);
      expect(report.invoices[0].invoiceId).toBe("inv-2026");

      // Both payments collected in 2026
      expect(report.payments).toHaveLength(2);
      expect(report.payments[0].paymentId).toBe("pay-1");
      expect(report.payments[1].paymentId).toBe("pay-2");
    });

    it("excludes payments outside the year", async () => {
      listedInvoices = [
        createListRecord(
          "inv-1",
          new Date("2026-01-01"),
          "REF",
          "1000.0000",
          "EUR",
        ),
      ];

      listedPayments = [
        createPayment(
          "pay-2025",
          "inv-1",
          new Date("2025-12-31"),
          "100.0000",
          "EUR",
        ),
        createPayment(
          "pay-2026",
          "inv-1",
          new Date("2026-01-01"),
          "200.0000",
          "EUR",
        ),
        createPayment(
          "pay-2027",
          "inv-1",
          new Date("2027-01-01"),
          "300.0000",
          "EUR",
        ),
      ];

      const report = await service.getAnnualInvoiceReport(context, 2026);

      expect(report.payments).toHaveLength(1);
      expect(report.payments[0].paymentId).toBe("pay-2026");
    });

    it("computes total collected per currency", async () => {
      listedInvoices = [
        createListRecord("inv-1", new Date("2026-01-01"), "A", "1000.0000", "EUR"),
        createListRecord("inv-2", new Date("2026-01-01"), "B", "500.0000", "USD"),
      ];

      listedPayments = [
        createPayment("p1", "inv-1", new Date("2026-02-01"), "600.0000", "EUR"),
        createPayment("p2", "inv-1", new Date("2026-03-01"), "400.0000", "EUR"),
        createPayment("p3", "inv-2", new Date("2026-02-15"), "250.0000", "USD"),
      ];

      const report = await service.getAnnualInvoiceReport(context, 2026);

      expect(report.totalCollectedByCurrency).toEqual([
        { currency: "EUR", amount: "1000.0000" },
        { currency: "USD", amount: "250.0000" },
      ]);
    });

    it("keeps EUR and USD separate in total", async () => {
      listedInvoices = [
        createListRecord("inv-1", new Date("2026-01-01"), "A", "100.0000", "EUR"),
        createListRecord("inv-2", new Date("2026-01-01"), "B", "100.0000", "USD"),
      ];

      listedPayments = [
        createPayment("p1", "inv-1", new Date("2026-01-10"), "50.0000", "EUR"),
        createPayment("p2", "inv-2", new Date("2026-01-15"), "75.0000", "USD"),
      ];

      const report = await service.getAnnualInvoiceReport(context, 2026);

      expect(report.totalCollectedByCurrency).toEqual([
        { currency: "EUR", amount: "50.0000" },
        { currency: "USD", amount: "75.0000" },
      ]);
    });
  });
});

function createListRecord(
  id: string,
  invoiceDate: Date,
  reference: string,
  amount: string,
  currency: string,
): InvoiceWorkspaceListRecord {
  return {
    ...createInvoice(id, invoiceDate, reference, amount, currency),
    clientId: "client-1",
    clientName: "Client A",
  };
}

function createInvoice(
  id: string,
  invoiceDate: Date,
  reference: string,
  amount: string,
  currency: string,
): InvoiceRecord {
  return {
    id,
    workspaceId: "workspace-1",
    contractId: "contract-1",
    invoiceDate,
    amount,
    currency,
    reference,
    paymentTermsDays: 30,
    dueDate: new Date(invoiceDate.getTime() + 30 * 24 * 60 * 60 * 1000),
    voidedAt: null,
    createdAt: invoiceDate,
    updatedAt: invoiceDate,
  };
}

function createPayment(
  id: string,
  invoiceId: string,
  paymentDate: Date,
  amount: string,
  currency: string,
): PaymentRecord {
  return {
    id,
    workspaceId: "workspace-1",
    invoiceId,
    paymentDate,
    amount,
    currency,
    notes: null,
    createdAt: paymentDate,
    updatedAt: paymentDate,
  };
}
