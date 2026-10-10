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
    commitmentMode: "PERCENTAGE",
    commitmentValue: "60",
    paymentTermsDays: "",
    paymentTermsNote: "",
    ...overrides,
  };

  for (const [key, value] of Object.entries(values)) {
    data.set(key, value);
  }

  return data;
}

function contractRecord(overrides: Partial<ContractRecord> = {}): ContractRecord {
  return {
    id: "contract-1",
    workspaceId: "workspace-1",
    clientId: "client-1",
    validFrom: new Date("2026-01-01T00:00:00.000Z"),
    validTo: new Date("2026-12-31T00:00:00.000Z"),
    billingModel: "HOURLY",
    rate: "80.0000",
    currency: "EUR",
    commitmentMode: "PERCENTAGE",
    commitmentPercentage: 60,
    allocatedMinutes: 115200, // Example lifetime budget
    paymentTermsDays: null,
    paymentTermsNote: null,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    ...overrides,
  };
}

describe("Contract form commitment mapping", () => {
  describe("PERCENTAGE commitment mode", () => {
    it("maps percentage commitment to persistence input", () => {
      const data = formData({ commitmentMode: "PERCENTAGE", commitmentValue: "60" });
      const values = readContractFormValues(data);
      const input = toContractCreateInput(values);
      const parsed = parseContractCreateInput(input);

      expect(parsed.commitmentMode).toBe("PERCENTAGE");
      expect(parsed.commitmentPercentage).toBe(60);
    });

    it("rejects negative percentage", () => {
      const data = formData({ commitmentMode: "PERCENTAGE", commitmentValue: "-10" });
      const values = readContractFormValues(data);
      const input = toContractCreateInput(values);

      expect(() => parseContractCreateInput(input)).toThrow(InvalidContractInputError);
    });

    it("allows over-commitment (>100%)", () => {
      const data = formData({ commitmentMode: "PERCENTAGE", commitmentValue: "150" });
      const values = readContractFormValues(data);
      const input = toContractCreateInput(values);
      const parsed = parseContractCreateInput(input);

      expect(parsed.commitmentPercentage).toBe(150);
    });

    it("accepts 0% commitment", () => {
      const data = formData({ commitmentMode: "PERCENTAGE", commitmentValue: "0" });
      const values = readContractFormValues(data);
      const input = toContractCreateInput(values);
      const parsed = parseContractCreateInput(input);

      expect(parsed.commitmentPercentage).toBe(0);
    });

    it("displays existing percentage commitment on edit", () => {
      const record = contractRecord({ commitmentMode: "PERCENTAGE", commitmentPercentage: 75 });
      const values = toContractFormValues(record, "EUR");

      expect(values.commitmentMode).toBe("PERCENTAGE");
      expect(values.commitmentValue).toBe("75");
    });
  });

  describe("TOTAL_HOURS commitment mode", () => {
    it("maps total hours commitment to persistence input", () => {
      const data = formData({ commitmentMode: "TOTAL_HOURS", commitmentValue: "320" });
      const values = readContractFormValues(data);
      const input = toContractCreateInput(values);
      const parsed = parseContractCreateInput(input);

      expect(parsed.commitmentMode).toBe("TOTAL_HOURS");
      expect(parsed.allocatedMinutes).toBe(19200); // 320 hours × 60
    });

    it("rejects negative hours", () => {
      const data = formData({ commitmentMode: "TOTAL_HOURS", commitmentValue: "-50" });
      const values = readContractFormValues(data);
      const input = toContractCreateInput(values);

      expect(() => parseContractCreateInput(input)).toThrow(InvalidContractInputError);
    });

    it("accepts 0 total hours", () => {
      const data = formData({ commitmentMode: "TOTAL_HOURS", commitmentValue: "0" });
      const values = readContractFormValues(data);
      const input = toContractCreateInput(values);
      const parsed = parseContractCreateInput(input);

      expect(parsed.allocatedMinutes).toBe(0);
    });

    it("displays existing total hours commitment on edit", () => {
      // allocatedMinutes: 96000 = 1600 hours
      const record = contractRecord({
        commitmentMode: "TOTAL_HOURS",
        commitmentPercentage: 80, // Derived from total hours
        allocatedMinutes: 96000,
      });
      const values = toContractFormValues(record, "EUR");

      expect(values.commitmentMode).toBe("TOTAL_HOURS");
      expect(values.commitmentValue).toBe("1600");
    });
  });

  describe("form value extraction", () => {
    it("reads all commitment fields from form data", () => {
      const data = formData({ commitmentMode: "PERCENTAGE", commitmentValue: "50" });
      const values = readContractFormValues(data);

      expect(values).toMatchObject({
        clientId: "client-1",
        commitmentMode: "PERCENTAGE",
        commitmentValue: "50",
      });
    });

    it("starts with empty commitment on create", () => {
      expect(EMPTY_CONTRACT_FORM_VALUES.commitmentMode).toBe("");
      expect(EMPTY_CONTRACT_FORM_VALUES.commitmentValue).toBe("");
    });
  });

  describe("update input mapping", () => {
    it("maps updated commitment to update input", () => {
      const data = formData({ commitmentMode: "PERCENTAGE", commitmentValue: "40" });
      const values = readContractFormValues(data);
      const input = toContractUpdateInput(values);
      const parsed = parseContractUpdateInput(input);

      expect(parsed.commitmentMode).toBe("PERCENTAGE");
      expect(parsed.commitmentPercentage).toBe(40);
    });

    it("allows changing from PERCENTAGE to TOTAL_HOURS", () => {
      const data = formData({ commitmentMode: "TOTAL_HOURS", commitmentValue: "200" });
      const values = readContractFormValues(data);
      const input = toContractUpdateInput(values);
      const parsed = parseContractUpdateInput(input);

      expect(parsed.commitmentMode).toBe("TOTAL_HOURS");
      expect(parsed.allocatedMinutes).toBe(12000); // 200 hours × 60
    });
  });
});
