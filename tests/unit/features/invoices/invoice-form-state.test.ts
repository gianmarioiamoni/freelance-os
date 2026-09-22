// tests/unit/features/invoices/invoice-form-state.test.ts
import { describe, expect, it } from "vitest";

import type { InvoiceRecord } from "@/domain/persistence-types";
import {
  createEmptyInvoiceFormValues,
  readInvoiceFormValues,
  toInvoiceCreateInput,
  toInvoiceFormValues,
  toInvoiceUpdateInput,
} from "@/features/invoices/invoice-form-state";

function invoiceRecord(overrides: Partial<InvoiceRecord> = {}): InvoiceRecord {
  return {
    id: "invoice-1",
    workspaceId: "workspace-1",
    contractId: "contract-1",
    invoiceDate: new Date("2026-09-01T00:00:00.000Z"),
    amount: "1500.2500",
    currency: "EUR",
    reference: "INV-1",
    paymentTermsDays: 30,
    dueDate: new Date("2026-10-01T00:00:00.000Z"),
    voidedAt: null,
    createdAt: new Date("2026-09-01T00:00:00.000Z"),
    updatedAt: new Date("2026-09-01T00:00:00.000Z"),
    ...overrides,
  };
}

describe("invoice form state", () => {
  it("reads form values and maps create input from the bound contract", () => {
    const values = readInvoiceFormValues(new FormData());
    const filled = readInvoiceFormValues(
      formData({
        invoiceDate: "2026-09-01",
        amount: "1500.25",
        reference: " INV-1 ",
        currency: "USD",
        dueDate: "2026-12-01",
        contractId: "forged-contract",
      }),
    );

    expect(values).toEqual({
      invoiceDate: "",
      amount: "",
      reference: "",
    });
    expect(toInvoiceCreateInput("contract-trusted", filled)).toEqual({
      contractId: "contract-trusted",
      invoiceDate: "2026-09-01",
      amount: "1500.25",
      reference: " INV-1 ",
    });
    expect(toInvoiceUpdateInput(filled)).toEqual({
      invoiceDate: "2026-09-01",
      amount: "1500.25",
      reference: " INV-1 ",
    });
    expect(toInvoiceUpdateInput(filled)).not.toHaveProperty("currency");
    expect(toInvoiceUpdateInput(filled)).not.toHaveProperty("dueDate");
    expect(toInvoiceUpdateInput(filled)).not.toHaveProperty("contractId");
  });

  it("maps persisted invoices onto form values and seeds an empty create form", () => {
    expect(toInvoiceFormValues(invoiceRecord())).toEqual({
      invoiceDate: "2026-09-01",
      amount: "1500.25",
      reference: "INV-1",
    });
    expect(
      toInvoiceFormValues(invoiceRecord({ amount: "80", reference: null })),
    ).toEqual({
      invoiceDate: "2026-09-01",
      amount: "80",
      reference: "",
    });
    expect(createEmptyInvoiceFormValues("2026-09-22")).toEqual({
      invoiceDate: "2026-09-22",
      amount: "",
      reference: "",
    });
  });
});

function formData(values: Record<string, string>): FormData {
  const data = new FormData();

  for (const [key, value] of Object.entries(values)) {
    data.set(key, value);
  }

  return data;
}
