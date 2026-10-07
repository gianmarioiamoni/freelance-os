// tests/unit/features/reporting/revenue-display.test.ts
import { describe, expect, it } from "vitest";
import type { CurrencyAmount } from "@/application/invoices/workspace-invoice-service";
import { formatInvoiceAmounts } from "@/features/reporting/revenue-display";

describe("formatInvoiceAmounts", () => {
  it("returns dash for empty amounts", () => {
    expect(formatInvoiceAmounts([])).toBe("-");
  });

  it("formats single currency amount", () => {
    const amounts: CurrencyAmount[] = [
      { currency: "EUR", amount: "1000.0000" },
    ];
    expect(formatInvoiceAmounts(amounts)).toBe("1000 EUR");
  });

  it("formats multiple currency amounts separately", () => {
    const amounts: CurrencyAmount[] = [
      { currency: "EUR", amount: "1500.5000" },
      { currency: "USD", amount: "2000.0000" },
    ];
    expect(formatInvoiceAmounts(amounts)).toBe("1500.5 EUR, 2000 USD");
  });

  it("removes trailing zeros from fraction", () => {
    const amounts: CurrencyAmount[] = [
      { currency: "EUR", amount: "1234.5600" },
    ];
    expect(formatInvoiceAmounts(amounts)).toBe("1234.56 EUR");
  });

  it("displays amount without decimal when all zeros", () => {
    const amounts: CurrencyAmount[] = [
      { currency: "USD", amount: "500.0000" },
    ];
    expect(formatInvoiceAmounts(amounts)).toBe("500 USD");
  });

  it("preserves significant decimal places", () => {
    const amounts: CurrencyAmount[] = [
      { currency: "EUR", amount: "99.9900" },
      { currency: "USD", amount: "1234.5678" },
    ];
    expect(formatInvoiceAmounts(amounts)).toBe("99.99 EUR, 1234.5678 USD");
  });
});
