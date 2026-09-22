// tests/unit/features/invoices/invoice-action-errors.test.ts
import { describe, expect, it } from "vitest";

import { ContractNotFoundError } from "@/domain/contract-errors";
import {
  InvoiceAlreadyVoidedError,
  InvoiceNotEditableError,
  InvoiceNotFoundError,
  InvalidInvoiceInputError,
} from "@/domain/invoice-errors";
import {
  mapInvoiceVoidError,
  mapInvoiceWriteError,
} from "@/features/invoices/invoice-action-errors";
import {
  INVOICE_ALREADY_VOIDED_ERROR,
  INVOICE_CONTRACT_NOT_FOUND_ERROR,
  INVOICE_CREATE_FAILED_ERROR,
  INVOICE_FIELD_ERROR_MESSAGES,
  INVOICE_NOT_EDITABLE_ERROR,
  INVOICE_NOT_FOUND_ERROR,
} from "@/features/invoices/invoice-form-state";

const values = {
  invoiceDate: "2026-09-01",
  amount: "0",
  reference: "",
};

describe("invoice action error mapping", () => {
  it("maps field, contract, and state errors onto form feedback", () => {
    expect(mapInvoiceWriteError(new InvalidInvoiceInputError("amount"), values, "create")).toEqual({
      error: INVOICE_FIELD_ERROR_MESSAGES.amount,
      field: "amount",
      values,
    });
    expect(mapInvoiceWriteError(new InvalidInvoiceInputError("currency"), values, "create")).toEqual({
      error: INVOICE_FIELD_ERROR_MESSAGES.currency,
      field: "currency",
      values,
    });
    expect(mapInvoiceWriteError(new ContractNotFoundError(), values, "create")).toEqual({
      error: INVOICE_CONTRACT_NOT_FOUND_ERROR,
      values,
    });
    expect(mapInvoiceWriteError(new InvoiceNotFoundError(), values, "update")).toEqual({
      error: INVOICE_NOT_FOUND_ERROR,
      values,
    });
    expect(mapInvoiceWriteError(new InvoiceNotEditableError(), values, "update")).toEqual({
      error: INVOICE_NOT_EDITABLE_ERROR,
      values,
    });
    expect(mapInvoiceWriteError(new Error("unexpected"), values, "create")).toEqual({
      error: INVOICE_CREATE_FAILED_ERROR,
      values,
    });
  });

  it("maps void confirmation failures without offering restore", () => {
    expect(mapInvoiceVoidError(new InvoiceNotFoundError())).toEqual({
      error: INVOICE_NOT_FOUND_ERROR,
    });
    expect(mapInvoiceVoidError(new InvoiceAlreadyVoidedError())).toEqual({
      error: INVOICE_ALREADY_VOIDED_ERROR,
    });
  });
});
