// tests/unit/features/payments/payment-action-errors.test.ts
import { describe, expect, it } from "vitest";

import { ContractNotFoundError } from "@/domain/contract-errors";
import {
  InvoiceNotEditableError,
  InvoiceNotFoundError,
} from "@/domain/invoice-errors";
import {
  InvalidPaymentInputError,
  PaymentNotFoundError,
} from "@/domain/payment-errors";
import {
  mapPaymentDeleteError,
  mapPaymentWriteError,
} from "@/features/payments/payment-action-errors";
import {
  PAYMENT_CREATE_FAILED_ERROR,
  PAYMENT_DELETE_FAILED_ERROR,
  PAYMENT_FIELD_ERROR_MESSAGES,
  PAYMENT_INVOICE_NOT_EDITABLE_ERROR,
  PAYMENT_INVOICE_NOT_FOUND_ERROR,
  PAYMENT_NOT_FOUND_ERROR,
} from "@/features/payments/payment-form-state";

const values = {
  paymentDate: "2026-09-15",
  amount: "0",
  notes: "",
};

describe("payment action error mapping", () => {
  it("maps field, invoice, payment, and VOID errors onto form feedback", () => {
    expect(mapPaymentWriteError(new InvalidPaymentInputError("amount"), values, "create")).toEqual({
      error: PAYMENT_FIELD_ERROR_MESSAGES.amount,
      field: "amount",
      values,
    });
    expect(
      mapPaymentWriteError(new InvalidPaymentInputError("paymentDate"), values, "create"),
    ).toEqual({
      error: PAYMENT_FIELD_ERROR_MESSAGES.paymentDate,
      field: "paymentDate",
      values,
    });
    expect(mapPaymentWriteError(new InvalidPaymentInputError("currency"), values, "create")).toEqual({
      error: PAYMENT_FIELD_ERROR_MESSAGES.currency,
      field: "currency",
      values,
    });
    expect(mapPaymentWriteError(new ContractNotFoundError(), values, "create")).toEqual({
      error: PAYMENT_INVOICE_NOT_FOUND_ERROR,
      values,
    });
    expect(mapPaymentWriteError(new InvoiceNotFoundError(), values, "update")).toEqual({
      error: PAYMENT_INVOICE_NOT_FOUND_ERROR,
      values,
    });
    expect(mapPaymentWriteError(new PaymentNotFoundError(), values, "update")).toEqual({
      error: PAYMENT_NOT_FOUND_ERROR,
      values,
    });
    expect(mapPaymentWriteError(new InvoiceNotEditableError(), values, "create")).toEqual({
      error: PAYMENT_INVOICE_NOT_EDITABLE_ERROR,
      values,
    });
    const unexpected = mapPaymentWriteError(new Error("prisma blow up"), values, "create");
    expect(unexpected).toEqual({
      error: PAYMENT_CREATE_FAILED_ERROR,
      values,
    });
    expect(unexpected?.error).not.toMatch(/prisma/i);
  });

  it("maps delete failures without exposing persistence details", () => {
    expect(mapPaymentDeleteError(new PaymentNotFoundError())).toEqual({
      error: PAYMENT_NOT_FOUND_ERROR,
    });
    expect(mapPaymentDeleteError(new InvoiceNotFoundError())).toEqual({
      error: PAYMENT_INVOICE_NOT_FOUND_ERROR,
    });
    expect(mapPaymentDeleteError(new InvoiceNotEditableError())).toEqual({
      error: PAYMENT_INVOICE_NOT_EDITABLE_ERROR,
    });
    expect(mapPaymentDeleteError(new Error("database down"))).toEqual({
      error: PAYMENT_DELETE_FAILED_ERROR,
    });
    expect(mapPaymentDeleteError(new Error("database down")).error).not.toMatch(/database/i);
  });
});
