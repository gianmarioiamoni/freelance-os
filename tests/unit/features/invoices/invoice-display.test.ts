// tests/unit/features/invoices/invoice-display.test.ts
import { describe, expect, it } from "vitest";

import type { InvoiceDerivedView } from "@/application/invoices/invoice-derived-view";
import {
  formatInvoiceAmount,
  formatInvoiceAmountStatus,
  formatInvoiceDueDate,
  formatInvoiceOutstanding,
  formatInvoiceOverdue,
  remainingInvoiceAmount,
  formatInvoiceTrackingState,
  invoiceEmptyStateCopy,
  invoiceListTitle,
  invoiceTrackingHref,
  previewDueDate,
  readInvoiceTrackingParam,
} from "@/features/invoices/invoice-display";

function invoiceView(
  overrides: Partial<InvoiceDerivedView> = {},
): InvoiceDerivedView {
  return {
    id: "invoice-1",
    workspaceId: "workspace-1",
    contractId: "contract-1",
    invoiceDate: new Date("2026-09-01T00:00:00.000Z"),
    amount: "1500.0000",
    currency: "EUR",
    reference: "INV-1",
    paymentTermsDays: 30,
    dueDate: new Date("2026-10-01T00:00:00.000Z"),
    voidedAt: null,
    createdAt: new Date("2026-09-01T00:00:00.000Z"),
    updatedAt: new Date("2026-09-01T00:00:00.000Z"),
    trackingState: "ACTIVE",
    paidAmount: "0",
    amountStatus: "UNPAID",
    overdue: false,
    ...overrides,
  };
}

describe("invoice display", () => {
  it("defaults the tracking filter to ACTIVE and builds contract-scoped hrefs", () => {
    expect(readInvoiceTrackingParam(undefined)).toBe("ACTIVE");
    expect(readInvoiceTrackingParam("")).toBe("ACTIVE");
    expect(readInvoiceTrackingParam("VOID")).toBe("VOID");
    expect(readInvoiceTrackingParam("ALL")).toBe("ALL");
    expect(readInvoiceTrackingParam("bogus")).toBe("ACTIVE");
    expect(invoiceTrackingHref("contract-1", "ACTIVE")).toBe("/contracts/contract-1");
    expect(invoiceTrackingHref("contract-1", "VOID")).toBe(
      "/contracts/contract-1?tracking=VOID",
    );
  });

  it("formats amount, currency, VOID, UNPAID, and overdue without mixing currencies", () => {
    expect(formatInvoiceAmount("1500.2500", "EUR")).toBe("1500.25 EUR");
    expect(formatInvoiceOutstanding("1500.2500", "0", "EUR")).toBe("1500.25 EUR");
    expect(formatInvoiceOutstanding("1500.2500", "500.0000", "EUR")).toBe("1000.25 EUR");
    expect(formatInvoiceOutstanding("1500", "1500", "EUR")).toBe("0 EUR");
    expect(formatInvoiceOutstanding("1500", "1600", "EUR")).toBe("0 EUR");
    expect(remainingInvoiceAmount("1500.0000", "0")).toBe("1500.0000");
    expect(remainingInvoiceAmount("1500", "400.5")).toBe("1099.5000");
    expect(formatInvoiceTrackingState("VOID")).toBe("Void");
    expect(formatInvoiceTrackingState("ACTIVE")).toBe("Active");
    expect(formatInvoiceAmountStatus("UNPAID")).toBe("Unpaid");
    expect(formatInvoiceAmountStatus("PARTIAL")).toBe("Partial");
    expect(formatInvoiceAmountStatus("PAID")).toBe("Paid");
    expect(formatInvoiceAmountStatus("MISMATCH")).toBe("Mismatch");
    expect(formatInvoiceOverdue(true)).toBe("Overdue");
    expect(formatInvoiceOverdue(false)).toBeNull();
    expect(formatInvoiceDueDate(null)).toBe("No due date");
    expect(formatInvoiceDueDate(new Date("2026-10-01T00:00:00.000Z"))).toBe(
      "2026-10-01",
    );
    expect(invoiceListTitle(invoiceView())).toBe("INV-1");
    expect(invoiceListTitle(invoiceView({ reference: null }))).toBe("1500 EUR");
    expect(invoiceEmptyStateCopy("ACTIVE").title).toBe("No active invoices");
    expect(invoiceEmptyStateCopy("VOID").title).toBe("No void invoices");
  });

  it("previews due date from invoice date and snapshotted terms", () => {
    expect(previewDueDate("2026-09-01", 30)).toBe("2026-10-01");
    expect(previewDueDate("2026-09-01", 0)).toBe("2026-09-01");
    expect(previewDueDate("2026-09-01", null)).toBeNull();
    expect(previewDueDate("not-a-date", 30)).toBeNull();
  });
});
