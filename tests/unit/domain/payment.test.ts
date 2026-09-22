// tests/unit/domain/payment.test.ts
import { describe, expect, it } from "vitest";

import type {
  CreatePaymentInput,
  PaymentRecord,
  UpdatePaymentInput,
} from "@/domain/persistence-types";

type ForbiddenUpdateField = "id" | "workspaceId" | "invoiceId" | "currency";
type UpdateLeaksImmutableField = keyof UpdatePaymentInput & ForbiddenUpdateField;
type AssertNever<T extends never> = T;

const _updateKeepsInvoiceAndCurrencyImmutable: AssertNever<UpdateLeaksImmutableField> =
  undefined as never;

describe("payment persistence types", () => {
  it("persists currency on create and keeps invoiceId plus currency off update", () => {
    const create: CreatePaymentInput = {
      invoiceId: "invoice-1",
      paymentDate: new Date("2026-09-15T00:00:00.000Z"),
      amount: "250.5000",
      currency: "EUR",
      notes: "wire",
    };
    const update: UpdatePaymentInput = {
      paymentDate: new Date("2026-09-16T00:00:00.000Z"),
      amount: "251.0000",
      notes: null,
    };
    const record: PaymentRecord = {
      id: "payment-1",
      workspaceId: "workspace-1",
      invoiceId: create.invoiceId,
      paymentDate: create.paymentDate,
      amount: create.amount,
      currency: create.currency,
      notes: create.notes ?? null,
      createdAt: new Date("2026-09-15T10:00:00.000Z"),
      updatedAt: new Date("2026-09-15T10:00:00.000Z"),
    };

    expect(create.currency).toBe("EUR");
    expect(record.currency).toBe("EUR");
    expect("invoiceId" in update).toBe(false);
    expect("currency" in update).toBe(false);
    expect(_updateKeepsInvoiceAndCurrencyImmutable).toBeUndefined();
  });
});
