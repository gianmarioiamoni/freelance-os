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
  commitmentMode: "PERCENTAGE",
  commitmentValue: "60",
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
  it("accepts valid create input and derives allocatedMinutes", () => {
    // Jan 1 - Jun 30, 2026: 129 working days × 60% × 8h × 60min = 37152 min
    expect(parseContractCreateInput(validCreateInput)).toEqual({
      clientId: "client-1",
      validFrom: calendarDate("2026-01-01"),
      validTo: calendarDate("2026-07-01"),
      billingModel: "HOURLY",
      rate: "80.5",
      currency: "EUR",
      commitmentMode: "PERCENTAGE",
      commitmentPercentage: 60,
      allocatedMinutes: 37152,
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

  it("rejects invalid commitment mode", () => {
    expectInvalidField(
      { ...validCreateInput, commitmentMode: "INVALID" },
      "commitmentMode",
    );
    expectInvalidField(
      { ...validCreateInput, commitmentMode: "" },
      "commitmentMode",
    );
  });

  it("rejects negative commitment value", () => {
    expectInvalidField(
      { ...validCreateInput, commitmentValue: "-10" },
      "commitmentValue",
    );
  });

  it("accepts PERCENTAGE and TOTAL_HOURS modes", () => {
    expect(
      parseContractCreateInput({
        ...validCreateInput,
        commitmentMode: "PERCENTAGE",
        commitmentValue: "100",
      }).commitmentPercentage,
    ).toBe(100);

    expect(
      parseContractCreateInput({
        ...validCreateInput,
        commitmentMode: "TOTAL_HOURS",
        commitmentValue: "100",
      }).allocatedMinutes,
    ).toBe(6000);
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

  it("derives allocatedMinutes based on commitment mode", () => {
    // PERCENTAGE mode with finite period → derives lifetime budget
    expect(
      parseContractCreateInput({
        ...validCreateInput,
        commitmentMode: "PERCENTAGE",
        commitmentValue: "60",
      }).allocatedMinutes,
    ).toBe(37152); // Jan 1 - Jun 30, 2026: 129 working days × 60% × 8h × 60min

    // PERCENTAGE mode with ongoing contract → null
    expect(
      parseContractCreateInput({
        ...validCreateInput,
        commitmentMode: "PERCENTAGE",
        commitmentValue: "60",
        validTo: "",
      }).allocatedMinutes,
    ).toBeNull();

    // TOTAL_HOURS mode → converts to minutes
    expect(
      parseContractCreateInput({
        ...validCreateInput,
        commitmentMode: "TOTAL_HOURS",
        commitmentValue: "100",
      }).allocatedMinutes,
    ).toBe(6000); // 100 hours = 6000 minutes

    // 0% commitment → allocatedMinutes still null for ongoing
    expect(
      parseContractCreateInput({
        ...validCreateInput,
        commitmentMode: "PERCENTAGE",
        commitmentValue: "0",
        validTo: "",
      }).allocatedMinutes,
    ).toBeNull();
  });

  it("rejects negative and non-integer commitment values", () => {
    expectInvalidField(
      { ...validCreateInput, commitmentValue: "-1" },
      "commitmentValue",
    );
    expectInvalidField(
      { ...validCreateInput, commitmentMode: "TOTAL_HOURS", commitmentValue: "-10" },
      "commitmentValue",
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
      commitmentMode: "PERCENTAGE",
      commitmentValue: "80",
    });

    expect(parsed).toMatchObject({
      validFrom: calendarDate("2026-02-01"),
      validTo: calendarDate("2026-08-01"),
      billingModel: "DAILY",
      rate: "500",
      currency: "USD",
      commitmentMode: "PERCENTAGE",
      commitmentPercentage: 80,
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
      commitmentMode: "PERCENTAGE",
      commitmentValue: "60",
      clientId: "client-other",
    } as Parameters<typeof parseContractUpdateInput>[0] & {
      clientId: string;
    });

    expect(parsed).not.toHaveProperty("clientId");
  });
});
