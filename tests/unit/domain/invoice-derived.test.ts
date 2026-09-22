// tests/unit/domain/invoice-derived.test.ts
import { describe, expect, it } from "vitest";

import {
  deriveAmountStatus,
  deriveInvoiceFields,
  isOverdue,
} from "@/domain/invoice-derived";
import { getTodayInTimezone } from "@/lib/analytics-periods";

const TODAY = { year: 2026, month: 9, day: 22 } as const;

function calendarDate(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

describe("deriveAmountStatus", () => {
  it("returns UNPAID when paidAmount is zero", () => {
    expect(deriveAmountStatus("1500", "0")).toBe("UNPAID");
    expect(deriveAmountStatus("1500.0000", "0.0")).toBe("UNPAID");
    expect(deriveAmountStatus("1500.2500", "0.0000")).toBe("UNPAID");
    expect(deriveAmountStatus("80.5", "+0")).toBe("UNPAID");
  });

  it("returns PARTIAL when paidAmount is between zero and amount", () => {
    expect(deriveAmountStatus("1500", "1")).toBe("PARTIAL");
    expect(deriveAmountStatus("1500.0000", "1499.9999")).toBe("PARTIAL");
    expect(deriveAmountStatus("10.0000", "0.0001")).toBe("PARTIAL");
  });

  it("returns PAID when paidAmount equals amount", () => {
    expect(deriveAmountStatus("1500", "1500")).toBe("PAID");
    expect(deriveAmountStatus("1500.0000", "1500")).toBe("PAID");
    expect(deriveAmountStatus("1500", "1500.0000")).toBe("PAID");
    expect(deriveAmountStatus("80.5", "80.50")).toBe("PAID");
    expect(deriveAmountStatus("1.10", "1.1")).toBe("PAID");
  });

  it("returns MISMATCH when paidAmount exceeds amount", () => {
    expect(deriveAmountStatus("1500", "1500.0001")).toBe("MISMATCH");
    expect(deriveAmountStatus("10.0000", "10.0001")).toBe("MISMATCH");
    expect(deriveAmountStatus("1", "2")).toBe("MISMATCH");
  });

  it("compares stored decimals exactly without floating-point artifacts", () => {
    expect(0.1 + 0.2).not.toBe(0.3);
    expect(deriveAmountStatus("0.3", "0.30")).toBe("PAID");
    expect(deriveAmountStatus("0.3", "0.2999")).toBe("PARTIAL");
    expect(deriveAmountStatus("0.3", "0.3001")).toBe("MISMATCH");
    expect(deriveAmountStatus("1.0000", "1.0000")).toBe("PAID");
    expect(deriveAmountStatus("1234.5678", "1234.5678")).toBe("PAID");
    expect(deriveAmountStatus("1234.5678", "1234.5677")).toBe("PARTIAL");
  });

  it("requires a positive invoice amount and exact equality", () => {
    expect(deriveAmountStatus("0.0001", "0")).toBe("UNPAID");
    expect(deriveAmountStatus("0.0001", "0.0001")).toBe("PAID");
    expect(deriveAmountStatus("0.0001", "0.0002")).toBe("MISMATCH");
  });
});

describe("isOverdue", () => {
  it("is never overdue when dueDate is null", () => {
    expect(isOverdue(null, TODAY, "0", "1500")).toBe(false);
    expect(isOverdue(null, TODAY, "100", "1500")).toBe(false);
    expect(isOverdue(null, TODAY, "1500", "1500")).toBe(false);
  });

  it("is overdue when dueDate is before today and unpaid", () => {
    expect(isOverdue(calendarDate("2026-09-21"), TODAY, "0", "1500")).toBe(true);
  });

  it("is overdue when dueDate is before today and partial", () => {
    expect(isOverdue(calendarDate("2026-09-21"), TODAY, "500", "1500")).toBe(true);
  });

  it("is not overdue when dueDate is before today and paid", () => {
    expect(isOverdue(calendarDate("2026-09-21"), TODAY, "1500", "1500")).toBe(
      false,
    );
    expect(isOverdue(calendarDate("2026-09-21"), TODAY, "1500.0000", "1500")).toBe(
      false,
    );
  });

  it("is not overdue when dueDate is before today and mismatched", () => {
    expect(isOverdue(calendarDate("2026-09-21"), TODAY, "1500.0001", "1500")).toBe(
      false,
    );
  });

  it("is not overdue when dueDate equals today", () => {
    expect(isOverdue(calendarDate("2026-09-22"), TODAY, "0", "1500")).toBe(false);
    expect(isOverdue(calendarDate("2026-09-22"), TODAY, "500", "1500")).toBe(
      false,
    );
  });

  it("is not overdue when dueDate is after today", () => {
    expect(isOverdue(calendarDate("2026-09-23"), TODAY, "0", "1500")).toBe(false);
    expect(isOverdue(calendarDate("2026-10-01"), TODAY, "500", "1500")).toBe(
      false,
    );
  });

  it("uses the caller-supplied today and never reads the system clock", () => {
    const dueDate = calendarDate("2026-09-21");

    expect(isOverdue(dueDate, { year: 2026, month: 9, day: 22 }, "0", "100")).toBe(
      true,
    );
    expect(isOverdue(dueDate, { year: 2026, month: 9, day: 21 }, "0", "100")).toBe(
      false,
    );
    expect(isOverdue(dueDate, { year: 2026, month: 9, day: 20 }, "0", "100")).toBe(
      false,
    );
  });

  it("lets the caller resolve today from Workspace.timezone", () => {
    const dueDate = calendarDate("2026-09-21");
    const instant = new Date("2026-09-22T00:30:00.000Z");
    const romeToday = getTodayInTimezone("Europe/Rome", instant);
    const laToday = getTodayInTimezone("America/Los_Angeles", instant);

    expect(romeToday).toEqual({ year: 2026, month: 9, day: 22 });
    expect(laToday).toEqual({ year: 2026, month: 9, day: 21 });
    expect(isOverdue(dueDate, romeToday, "0", "100")).toBe(true);
    expect(isOverdue(dueDate, laToday, "0", "100")).toBe(false);
  });

  it("compares stored UTC calendar components so process timezone cannot shift the day", () => {
    const dueDate = new Date("2026-09-21T00:00:00.000Z");

    expect(dueDate.getUTCFullYear()).toBe(2026);
    expect(dueDate.getUTCMonth()).toBe(8);
    expect(dueDate.getUTCDate()).toBe(21);
    expect(isOverdue(dueDate, TODAY, "0", "100")).toBe(true);
  });
});

describe("deriveInvoiceFields", () => {
  it("derives E02 unpaid fields without mutating the invoice record", () => {
    const invoice = {
      amount: "1500.0000",
      dueDate: calendarDate("2026-09-21"),
      voidedAt: null,
    };

    const derived = deriveInvoiceFields(invoice, TODAY);

    expect(derived).toEqual({
      trackingState: "ACTIVE",
      paidAmount: "0",
      amountStatus: "UNPAID",
      overdue: true,
    });
    expect(invoice).toEqual({
      amount: "1500.0000",
      dueDate: calendarDate("2026-09-21"),
      voidedAt: null,
    });
  });

  it("keeps VOID mathematical predicates and marks trackingState VOID", () => {
    const derived = deriveInvoiceFields(
      {
        amount: "1500",
        dueDate: calendarDate("2026-09-21"),
        voidedAt: new Date("2026-09-22T10:00:00.000Z"),
      },
      TODAY,
    );

    expect(derived.trackingState).toBe("VOID");
    expect(derived.amountStatus).toBe("UNPAID");
    expect(derived.overdue).toBe(true);
    expect(derived.paidAmount).toBe("0");
  });
});
