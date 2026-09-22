// tests/unit/features/payments/payment-form-state.test.ts
import { describe, expect, it } from "vitest";

import type { PaymentRecord } from "@/domain/persistence-types";
import {
  createEmptyPaymentFormValues,
  readPaymentFormValues,
  toPaymentCreateInput,
  toPaymentFormValues,
  toPaymentUpdateInput,
} from "@/features/payments/payment-form-state";

function paymentRecord(overrides: Partial<PaymentRecord> = {}): PaymentRecord {
  return {
    id: "payment-1",
    workspaceId: "workspace-1",
    invoiceId: "invoice-1",
    paymentDate: new Date("2026-09-15T00:00:00.000Z"),
    amount: "500.2500",
    currency: "EUR",
    notes: "First installment",
    createdAt: new Date("2026-09-15T00:00:00.000Z"),
    updatedAt: new Date("2026-09-15T00:00:00.000Z"),
    ...overrides,
  };
}

describe("payment form state", () => {
  it("reads form values without accepting invoiceId or currency from the client", () => {
    const values = readPaymentFormValues(new FormData());
    const filled = readPaymentFormValues(
      formData({
        paymentDate: "2026-09-20",
        amount: "250.5",
        notes: " Bank transfer ",
        currency: "USD",
        invoiceId: "forged-invoice",
      }),
    );

    expect(values).toEqual({
      paymentDate: "",
      amount: "",
      notes: "",
    });
    expect(toPaymentCreateInput("invoice-trusted", filled)).toEqual({
      invoiceId: "invoice-trusted",
      paymentDate: "2026-09-20",
      amount: "250.5",
      notes: " Bank transfer ",
    });
    expect(toPaymentCreateInput("invoice-trusted", filled)).not.toHaveProperty("currency");
    expect(toPaymentUpdateInput(filled)).toEqual({
      paymentDate: "2026-09-20",
      amount: "250.5",
      notes: " Bank transfer ",
    });
    expect(toPaymentUpdateInput(filled)).not.toHaveProperty("currency");
    expect(toPaymentUpdateInput(filled)).not.toHaveProperty("invoiceId");
  });

  it("maps persisted payments onto form values and seeds an empty create form", () => {
    expect(toPaymentFormValues(paymentRecord())).toEqual({
      paymentDate: "2026-09-15",
      amount: "500.25",
      notes: "First installment",
    });
    expect(
      toPaymentFormValues(paymentRecord({ amount: "80", notes: null })),
    ).toEqual({
      paymentDate: "2026-09-15",
      amount: "80",
      notes: "",
    });
    expect(createEmptyPaymentFormValues("2026-09-23")).toEqual({
      paymentDate: "2026-09-23",
      amount: "",
      notes: "",
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
