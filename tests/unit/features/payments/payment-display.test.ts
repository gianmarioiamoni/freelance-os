// tests/unit/features/payments/payment-display.test.ts
import { describe, expect, it } from "vitest";

import {
  paymentCreatePath,
  paymentDeleteConfirmHref,
  paymentEditPath,
  paymentNotesText,
} from "@/features/payments/payment-display";

describe("payment display", () => {
  it("builds invoice-scoped payment paths", () => {
    expect(paymentCreatePath("contract-1", "invoice-1")).toBe(
      "/contracts/contract-1/invoices/invoice-1/payments/new",
    );
    expect(paymentEditPath("contract-1", "invoice-1", "payment-1")).toBe(
      "/contracts/contract-1/invoices/invoice-1/payments/payment-1/edit",
    );
    expect(paymentDeleteConfirmHref("contract-1", "invoice-1", "payment-1")).toBe(
      "/contracts/contract-1/invoices/invoice-1?confirm=delete-payment&paymentId=payment-1",
    );
  });

  it("shows notes only when present", () => {
    expect(paymentNotesText("Bank transfer")).toBe("Bank transfer");
    expect(paymentNotesText(null)).toBeNull();
    expect(paymentNotesText("")).toBeNull();
  });
});
