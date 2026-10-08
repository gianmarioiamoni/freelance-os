// tests/unit/application/contracts/contract-commitment-input.test.ts
import { describe, expect, it } from "vitest";

import { parseContractCreateInput } from "@/application/contracts/contract-input";
import { InvalidContractInputError } from "@/domain/contract-errors";

function date(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

const baseInput = {
  clientId: "client-1",
  validFrom: "2026-09-21",
  validTo: "2026-10-31",
  billingModel: "HOURLY",
  rate: "80.5",
  currency: "EUR",
  paymentTermsDays: "30",
  paymentTermsNote: "Net 30",
};

describe("parseContractCreateInput - PERCENTAGE mode", () => {
  it("parses PERCENTAGE commitment", () => {
    const result = parseContractCreateInput({
      ...baseInput,
      commitmentMode: "PERCENTAGE",
      commitmentValue: "60",
    });

    expect(result.commitmentMode).toBe("PERCENTAGE");
    expect(result.commitmentPercentage).toBe(60);
    // 60% × 30 working days × 8h × 60 = 8,640 minutes
    expect(result.allocatedMinutes).toBe(8640);
  });

  it("accepts 0% commitment", () => {
    const result = parseContractCreateInput({
      ...baseInput,
      commitmentMode: "PERCENTAGE",
      commitmentValue: "0",
    });

    expect(result.commitmentPercentage).toBe(0);
    expect(result.allocatedMinutes).toBe(0);
  });

  it("accepts >100% commitment", () => {
    const result = parseContractCreateInput({
      ...baseInput,
      commitmentMode: "PERCENTAGE",
      commitmentValue: "150",
    });

    expect(result.commitmentPercentage).toBe(150);
    // 150% × 30 working days × 8h × 60 = 21,600 minutes
    expect(result.allocatedMinutes).toBe(21600);
  });
});

describe("parseContractCreateInput - TOTAL_HOURS mode", () => {
  it("converts total hours to percentage", () => {
    const result = parseContractCreateInput({
      ...baseInput,
      commitmentMode: "TOTAL_HOURS",
      commitmentValue: "144", // 144h = 60% of 240h capacity
    });

    expect(result.commitmentMode).toBe("TOTAL_HOURS");
    expect(result.commitmentPercentage).toBe(60);
    expect(result.allocatedMinutes).toBe(8640);
  });

  it("PERCENTAGE and TOTAL_HOURS produce equivalent results", () => {
    const percentageResult = parseContractCreateInput({
      ...baseInput,
      commitmentMode: "PERCENTAGE",
      commitmentValue: "60",
    });

    const totalHoursResult = parseContractCreateInput({
      ...baseInput,
      commitmentMode: "TOTAL_HOURS",
      commitmentValue: "144", // equivalent to 60%
    });

    expect(percentageResult.commitmentPercentage).toBe(60);
    expect(totalHoursResult.commitmentPercentage).toBe(60);
    expect(percentageResult.allocatedMinutes).toBe(totalHoursResult.allocatedMinutes);
  });
});

describe("parseContractCreateInput - ongoing contracts", () => {
  it("handles ongoing contract (validTo = null)", () => {
    const result = parseContractCreateInput({
      ...baseInput,
      validTo: null,
      commitmentMode: "PERCENTAGE",
      commitmentValue: "60",
    });

    expect(result.commitmentPercentage).toBe(60);
    expect(result.allocatedMinutes).toBeNull(); // ongoing: no finite budget
  });

  it("rejects TOTAL_HOURS for ongoing contracts", () => {
    expect(() =>
      parseContractCreateInput({
        ...baseInput,
        validTo: null,
        commitmentMode: "TOTAL_HOURS",
        commitmentValue: "144",
      }),
    ).toThrow(InvalidContractInputError);
  });
});

describe("parseContractCreateInput - validation", () => {
  it("rejects negative commitment value", () => {
    expect(() =>
      parseContractCreateInput({
        ...baseInput,
        commitmentMode: "PERCENTAGE",
        commitmentValue: "-10",
      }),
    ).toThrow(InvalidContractInputError);
  });

  it("rejects invalid commitment mode", () => {
    expect(() =>
      parseContractCreateInput({
        ...baseInput,
        commitmentMode: "INVALID",
        commitmentValue: "60",
      }),
    ).toThrow(InvalidContractInputError);
  });

  it("rejects empty commitment value", () => {
    expect(() =>
      parseContractCreateInput({
        ...baseInput,
        commitmentMode: "PERCENTAGE",
        commitmentValue: "",
      }),
    ).toThrow(InvalidContractInputError);
  });
});
