// tests/unit/features/contracts/contract-form-state.test.ts
import { describe, expect, it } from "vitest";

import {
  parseContractCreateInput,
  parseContractUpdateInput,
} from "@/application/contracts/contract-input";
import { InvalidContractInputError } from "@/domain/contract-errors";
import type { ContractRecord } from "@/domain/persistence-types";
import {
  EMPTY_CONTRACT_FORM_VALUES,
  readContractFormValues,
  toContractCreateInput,
  toContractFormValues,
  toContractUpdateInput,
} from "@/features/contracts/contract-form-state";

function formData(overrides: Record<string, string> = {}): FormData {
  const data = new FormData();
  const values = {
    clientId: "client-1",
    validFrom: "2026-01-01",
    validTo: "2026-12-31",
    billingModel: "HOURLY",
    rate: "80",
    currency: "EUR",
    monthlyContractedHours: "",
    allocatedMinutes: "",
    paymentTermsDays: "",
    paymentTermsNote: "",
    ...overrides,
  };

  for (const [key, value] of Object.entries(values)) {
    data.set(key, value);
  }

  return data;
}

function contract(overrides: Partial<ContractRecord> = {}): ContractRecord {
  return {
    id: "contract-1",
    workspaceId: "workspace-1",
    clientId: "client-1",
    validFrom: new Date("2026-01-01T00:00:00.000Z"),
    validTo: new Date("2026-12-31T00:00:00.000Z"),
    billingModel: "HOURLY",
    rate: "80",
    currency: "EUR",
    monthlyContractedMinutes: null,
    allocatedMinutes: null,
    paymentTermsDays: null,
    paymentTermsNote: null,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    ...overrides,
  };
}

describe("Contract form allocatedMinutes mapping", () => {
  it("maps empty allocation to null", () => {
    const values = readContractFormValues(formData());
    expect(values.allocatedMinutes).toBe("");
    expect(parseContractCreateInput(toContractCreateInput(values)).allocatedMinutes).toBeNull();
  });

  it("maps 0 to persisted 0", () => {
    const values = readContractFormValues(formData({ allocatedMinutes: "0" }));
    expect(parseContractCreateInput(toContractCreateInput(values)).allocatedMinutes).toBe(0);
  });

  it("maps a positive integer to the persisted value", () => {
    const values = readContractFormValues(formData({ allocatedMinutes: "4800" }));
    expect(parseContractCreateInput(toContractCreateInput(values)).allocatedMinutes).toBe(4800);
  });

  it("rejects negative allocation through the existing parser", () => {
    const values = readContractFormValues(formData({ allocatedMinutes: "-1" }));
    try {
      parseContractCreateInput(toContractCreateInput(values));
      throw new Error("expected validation to fail");
    } catch (error) {
      expect(error).toBeInstanceOf(InvalidContractInputError);
      expect((error as InvalidContractInputError).field).toBe("allocatedMinutes");
    }
  });

  it("rejects non-integer allocation through the existing parser", () => {
    const values = readContractFormValues(formData({ allocatedMinutes: "1.5" }));
    try {
      parseContractCreateInput(toContractCreateInput(values));
      throw new Error("expected validation to fail");
    } catch (error) {
      expect(error).toBeInstanceOf(InvalidContractInputError);
      expect((error as InvalidContractInputError).field).toBe("allocatedMinutes");
    }
  });

  it("displays an existing allocation on edit", () => {
    expect(toContractFormValues(contract({ allocatedMinutes: 1000 }), "EUR").allocatedMinutes).toBe(
      "1000",
    );
  });

  it("displays zero allocation as 0, not empty", () => {
    expect(toContractFormValues(contract({ allocatedMinutes: 0 }), "EUR").allocatedMinutes).toBe(
      "0",
    );
  });

  it("clears an existing allocation to null", () => {
    const values = {
      ...toContractFormValues(contract({ allocatedMinutes: 1000 }), "EUR"),
      allocatedMinutes: "",
    };
    expect(parseContractUpdateInput(toContractUpdateInput(values)).allocatedMinutes).toBeNull();
  });

  it("changes a positive allocation to 0", () => {
    const values = {
      ...toContractFormValues(contract({ allocatedMinutes: 1000 }), "EUR"),
      allocatedMinutes: "0",
    };
    expect(parseContractUpdateInput(toContractUpdateInput(values)).allocatedMinutes).toBe(0);
  });

  it("keeps an unchanged allocation when the displayed value is resubmitted", () => {
    const values = toContractFormValues(contract({ allocatedMinutes: 1000 }), "EUR");
    expect(parseContractUpdateInput(toContractUpdateInput(values)).allocatedMinutes).toBe(1000);
  });

  it("starts empty on create", () => {
    expect(EMPTY_CONTRACT_FORM_VALUES.allocatedMinutes).toBe("");
  });
});
