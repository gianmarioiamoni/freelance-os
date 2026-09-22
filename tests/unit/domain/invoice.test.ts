// tests/unit/domain/invoice.test.ts
import { describe, expect, it } from "vitest";

import {
  INVOICE_REFERENCE_MAX_LENGTH,
  assertDueDateTermsConsistency,
  invoiceTrackingState,
  isActiveInvoice,
  normalizeInvoiceReference,
  parseInvoiceAmount,
  parseInvoiceCurrency,
  parseInvoicePaymentTermsDays,
} from "@/domain/invoice";
import { InvalidInvoiceInputError } from "@/domain/invoice-errors";

function expectInvalidField(
  run: () => unknown,
  field: InvalidInvoiceInputError["field"],
): void {
  try {
    run();
    throw new Error("expected validation to fail");
  } catch (error) {
    expect(error).toBeInstanceOf(InvalidInvoiceInputError);
    expect((error as InvalidInvoiceInputError).field).toBe(field);
  }
}

describe("invoice tracking representation", () => {
  it("treats null voidedAt as ACTIVE", () => {
    expect(invoiceTrackingState(null)).toBe("ACTIVE");
    expect(isActiveInvoice(null)).toBe(true);
  });

  it("treats a voidedAt timestamp as VOID", () => {
    const voidedAt = new Date("2026-09-22T10:00:00.000Z");
    expect(invoiceTrackingState(voidedAt)).toBe("VOID");
    expect(isActiveInvoice(voidedAt)).toBe(false);
  });
});

describe("invoice amount", () => {
  it("accepts a positive amount with up to four decimal places", () => {
    expect(parseInvoiceAmount("1")).toBe("1");
    expect(parseInvoiceAmount("80.5")).toBe("80.5");
    expect(parseInvoiceAmount("1234.5678")).toBe("1234.5678");
  });

  it("rejects zero, negative, and over-precise amounts", () => {
    expectInvalidField(() => parseInvoiceAmount("0"), "amount");
    expectInvalidField(() => parseInvoiceAmount("-10"), "amount");
    expectInvalidField(() => parseInvoiceAmount("1.23456"), "amount");
    expectInvalidField(() => parseInvoiceAmount(""), "amount");
  });
});

describe("invoice currency shape", () => {
  it("normalizes a supported ISO 4217 code", () => {
    expect(parseInvoiceCurrency("eur")).toBe("EUR");
    expect(parseInvoiceCurrency("USD")).toBe("USD");
  });

  it("rejects an invalid currency shape", () => {
    expectInvalidField(() => parseInvoiceCurrency("EU"), "currency");
    expectInvalidField(() => parseInvoiceCurrency("EURO"), "currency");
    expectInvalidField(() => parseInvoiceCurrency("ZZZ"), "currency");
    expectInvalidField(() => parseInvoiceCurrency(""), "currency");
  });
});

describe("invoice reference", () => {
  it("normalizes missing or blank reference to null", () => {
    expect(normalizeInvoiceReference(undefined)).toBeNull();
    expect(normalizeInvoiceReference(null)).toBeNull();
    expect(normalizeInvoiceReference("")).toBeNull();
    expect(normalizeInvoiceReference("   ")).toBeNull();
  });

  it("trims a present reference and rejects overlong text", () => {
    expect(normalizeInvoiceReference("  INV-1  ")).toBe("INV-1");
    expectInvalidField(
      () => normalizeInvoiceReference("x".repeat(INVOICE_REFERENCE_MAX_LENGTH + 1)),
      "reference",
    );
  });
});

describe("invoice payment terms snapshot", () => {
  it("treats missing terms as null and accepts zero", () => {
    expect(parseInvoicePaymentTermsDays(undefined)).toBeNull();
    expect(parseInvoicePaymentTermsDays(null)).toBeNull();
    expect(parseInvoicePaymentTermsDays("")).toBeNull();
    expect(parseInvoicePaymentTermsDays(0)).toBe(0);
    expect(parseInvoicePaymentTermsDays("30")).toBe(30);
  });

  it("rejects negative or non-integer terms", () => {
    expectInvalidField(() => parseInvoicePaymentTermsDays("-1"), "paymentTermsDays");
    expectInvalidField(() => parseInvoicePaymentTermsDays("1.5"), "paymentTermsDays");
  });
});

describe("dueDate and paymentTermsDays consistency", () => {
  it("allows both null or both present", () => {
    expect(() => assertDueDateTermsConsistency(null, null)).not.toThrow();
    expect(() =>
      assertDueDateTermsConsistency(30, new Date("2026-10-22T00:00:00.000Z")),
    ).not.toThrow();
  });

  it("rejects a mismatched pair", () => {
    expectInvalidField(
      () => assertDueDateTermsConsistency(30, null),
      "dueDate",
    );
    expectInvalidField(
      () => assertDueDateTermsConsistency(null, new Date("2026-10-22T00:00:00.000Z")),
      "paymentTermsDays",
    );
  });
});
