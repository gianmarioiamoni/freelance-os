// tests/unit/application/contracts/contract-input.test.ts
import { describe, expect, it } from "vitest";

import {
  PAYMENT_TERMS_NOTE_MAX_LENGTH,
  parseContractCreateInput,
  parseContractUpdateInput,
} from "@/application/contracts/contract-input";
import {
  InvalidContractInputError,
  InvalidContractPeriodError,
} from "@/domain/contract-errors";

const validCreateInput = {
  clientId: "client-1",
  validFrom: "2026-01-01",
  validTo: "2026-07-01",
  billingModel: "HOURLY",
  rate: "80.5",
  currency: "eur",
  monthlyContractedHours: "10",
  paymentTermsDays: "30",
  paymentTermsNote: "Net 30",
};

function calendarDate(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

function expectInvalidField(
  input: Parameters<typeof parseContractCreateInput>[0],
  field: InvalidContractInputError["field"],
): void {
  try {
    parseContractCreateInput(input);
    throw new Error("expected validation to fail");
  } catch (error) {
    expect(error).toBeInstanceOf(InvalidContractInputError);
    expect((error as InvalidContractInputError).field).toBe(field);
  }
}

describe("parseContractCreateInput", () => {
  it("accepts valid create input", () => {
    expect(parseContractCreateInput(validCreateInput)).toEqual({
      clientId: "client-1",
      validFrom: calendarDate("2026-01-01"),
      validTo: calendarDate("2026-07-01"),
      billingModel: "HOURLY",
      rate: "80.5",
      currency: "EUR",
      monthlyContractedMinutes: 600,
      allocatedMinutes: null,
      paymentTermsDays: 30,
      paymentTermsNote: "Net 30",
    });
  });

  it("accepts an open-ended validTo", () => {
    expect(
      parseContractCreateInput({
        ...validCreateInput,
        validTo: "",
      }).validTo,
    ).toBeNull();
    expect(
      parseContractCreateInput({
        ...validCreateInput,
        validTo: null,
      }).validTo,
    ).toBeNull();
  });

  it("rejects a missing clientId", () => {
    expectInvalidField(
      { ...validCreateInput, clientId: undefined as unknown as string },
      "clientId",
    );
    expectInvalidField({ ...validCreateInput, clientId: "   " }, "clientId");
  });

  it("rejects a missing validFrom", () => {
    expectInvalidField(
      { ...validCreateInput, validFrom: undefined as unknown as string },
      "validFrom",
    );
    expectInvalidField({ ...validCreateInput, validFrom: "" }, "validFrom");
  });

  it("rejects an invalid calendar date", () => {
    expectInvalidField(
      { ...validCreateInput, validFrom: "2026-13-01" },
      "validFrom",
    );
    expectInvalidField({ ...validCreateInput, validTo: "2026-02-31" }, "validTo");
  });

  it("rejects validTo on or before validFrom", () => {
    expect(() =>
      parseContractCreateInput({
        ...validCreateInput,
        validFrom: "2026-07-01",
        validTo: "2026-07-01",
      }),
    ).toThrow(InvalidContractPeriodError);
    expect(() =>
      parseContractCreateInput({
        ...validCreateInput,
        validFrom: "2026-07-01",
        validTo: "2026-06-30",
      }),
    ).toThrow(InvalidContractPeriodError);
  });

  it("rejects billing models other than HOURLY or DAILY", () => {
    expectInvalidField(
      { ...validCreateInput, billingModel: "MONTHLY_FIXED" },
      "billingModel",
    );
    expectInvalidField({ ...validCreateInput, billingModel: "" }, "billingModel");
  });

  it("rejects an invalid rate", () => {
    expectInvalidField({ ...validCreateInput, rate: "0" }, "rate");
    expectInvalidField({ ...validCreateInput, rate: "-1" }, "rate");
    expectInvalidField({ ...validCreateInput, rate: "80.12345" }, "rate");
    expectInvalidField({ ...validCreateInput, rate: "abc" }, "rate");
    expectInvalidField({ ...validCreateInput, rate: "" }, "rate");
  });

  it("rejects a currency that is not ISO-4217", () => {
    expectInvalidField({ ...validCreateInput, currency: "ZZZ" }, "currency");
    expectInvalidField({ ...validCreateInput, currency: "" }, "currency");
  });

  it("rejects monthly hours that are not a positive exact minute conversion", () => {
    expectInvalidField(
      { ...validCreateInput, monthlyContractedHours: "0" },
      "monthlyContractedHours",
    );
    expectInvalidField(
      { ...validCreateInput, monthlyContractedHours: "-1" },
      "monthlyContractedHours",
    );
    expectInvalidField(
      { ...validCreateInput, monthlyContractedHours: "1.51" },
      "monthlyContractedHours",
    );
  });

  it("converts exact monthly hours to minutes", () => {
    expect(
      parseContractCreateInput({
        ...validCreateInput,
        monthlyContractedHours: "1.5",
      }).monthlyContractedMinutes,
    ).toBe(90);
    expect(
      parseContractCreateInput({
        ...validCreateInput,
        monthlyContractedHours: "",
      }).monthlyContractedMinutes,
    ).toBeNull();
  });

  it("rejects invalid payment terms", () => {
    expectInvalidField(
      { ...validCreateInput, paymentTermsDays: "-1" },
      "paymentTermsDays",
    );
    expectInvalidField(
      { ...validCreateInput, paymentTermsDays: "1.5" },
      "paymentTermsDays",
    );
    expectInvalidField(
      {
        ...validCreateInput,
        paymentTermsNote: "n".repeat(PAYMENT_TERMS_NOTE_MAX_LENGTH + 1),
      },
      "paymentTermsNote",
    );
  });

  it("accepts zero payment terms days and trims the note", () => {
    expect(
      parseContractCreateInput({
        ...validCreateInput,
        paymentTermsDays: "0",
        paymentTermsNote: "  Net 0  ",
      }),
    ).toMatchObject({
      paymentTermsDays: 0,
      paymentTermsNote: "Net 0",
    });
  });

  it("accepts null, zero, and positive allocatedMinutes", () => {
    expect(
      parseContractCreateInput({
        ...validCreateInput,
        allocatedMinutes: null,
      }).allocatedMinutes,
    ).toBeNull();
    expect(
      parseContractCreateInput({
        ...validCreateInput,
        allocatedMinutes: "",
      }).allocatedMinutes,
    ).toBeNull();
    expect(
      parseContractCreateInput({
        ...validCreateInput,
        allocatedMinutes: "0",
      }).allocatedMinutes,
    ).toBe(0);
    expect(
      parseContractCreateInput({
        ...validCreateInput,
        allocatedMinutes: 0,
      }).allocatedMinutes,
    ).toBe(0);
    expect(
      parseContractCreateInput({
        ...validCreateInput,
        allocatedMinutes: "4800",
      }).allocatedMinutes,
    ).toBe(4800);
    expect(
      parseContractCreateInput({
        ...validCreateInput,
        allocatedMinutes: 4800,
      }).allocatedMinutes,
    ).toBe(4800);
  });

  it("rejects negative and non-integer allocatedMinutes", () => {
    expectInvalidField(
      { ...validCreateInput, allocatedMinutes: "-1" },
      "allocatedMinutes",
    );
    expectInvalidField(
      { ...validCreateInput, allocatedMinutes: -1 },
      "allocatedMinutes",
    );
    expectInvalidField(
      { ...validCreateInput, allocatedMinutes: "1.5" },
      "allocatedMinutes",
    );
    expectInvalidField(
      { ...validCreateInput, allocatedMinutes: 1.5 },
      "allocatedMinutes",
    );
    expectInvalidField(
      { ...validCreateInput, allocatedMinutes: "abc" },
      "allocatedMinutes",
    );
  });

  it("does not accept workspaceId from create input", () => {
    const parsed = parseContractCreateInput({
      ...validCreateInput,
      workspaceId: "workspace-from-form",
    } as typeof validCreateInput);

    expect(parsed).not.toHaveProperty("workspaceId");
  });
});

describe("parseContractUpdateInput", () => {
  it("accepts valid update input without clientId", () => {
    const parsed = parseContractUpdateInput({
      validFrom: "2026-02-01",
      validTo: "2026-08-01",
      billingModel: "DAILY",
      rate: "500",
      currency: "USD",
    });

    expect(parsed).toEqual({
      validFrom: calendarDate("2026-02-01"),
      validTo: calendarDate("2026-08-01"),
      billingModel: "DAILY",
      rate: "500",
      currency: "USD",
      monthlyContractedMinutes: null,
      allocatedMinutes: null,
      paymentTermsDays: null,
      paymentTermsNote: null,
    });
    expect(parsed).not.toHaveProperty("clientId");
    expect(parsed).not.toHaveProperty("workspaceId");
  });

  it("ignores a supplied clientId on update", () => {
    const parsed = parseContractUpdateInput({
      validFrom: "2026-02-01",
      billingModel: "HOURLY",
      rate: "90",
      currency: "EUR",
      clientId: "client-other",
    } as Parameters<typeof parseContractUpdateInput>[0] & {
      clientId: string;
    });

    expect(parsed).not.toHaveProperty("clientId");
  });
});
