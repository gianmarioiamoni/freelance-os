// tests/unit/application/contracts/contract-reference.test.ts
import { describe, expect, it } from "vitest";

import {
  parseContractCreateInput,
  parseContractUpdateInput,
  CONTRACT_REFERENCE_MAX_LENGTH,
} from "@/application/contracts/contract-input";
import { InvalidContractInputError } from "@/domain/contract-errors";

function calendarDate(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

const baseInput = {
  validFrom: "2026-01-01",
  validTo: "2026-12-31",
  billingModel: "HOURLY",
  rate: "100",
  currency: "EUR",
  commitmentMode: "PERCENTAGE",
  commitmentValue: "80",
  paymentTermsDays: "30",
  paymentTermsNote: null,
};

describe("Contract reference field", () => {
  describe("parseContractCreateInput with reference", () => {
    it("accepts valid reference", () => {
      const result = parseContractCreateInput({
        clientId: "client-1",
        reference: "Sviluppo portale e-commerce",
        ...baseInput,
      });

      expect(result.reference).toBe("Sviluppo portale e-commerce");
    });

    it("trims whitespace from reference", () => {
      const result = parseContractCreateInput({
        clientId: "client-1",
        reference: "  Progetto Web  ",
        ...baseInput,
      });

      expect(result.reference).toBe("Progetto Web");
    });

    it("treats empty string as null", () => {
      const result = parseContractCreateInput({
        clientId: "client-1",
        reference: "",
        ...baseInput,
      });

      expect(result.reference).toBeNull();
    });

    it("treats whitespace-only string as null", () => {
      const result = parseContractCreateInput({
        clientId: "client-1",
        reference: "   ",
        ...baseInput,
      });

      expect(result.reference).toBeNull();
    });

    it("treats missing reference as null", () => {
      const result = parseContractCreateInput({
        clientId: "client-1",
        ...baseInput,
      });

      expect(result.reference).toBeNull();
    });

    it("accepts reference at max length", () => {
      const maxLengthRef = "A".repeat(CONTRACT_REFERENCE_MAX_LENGTH);
      const result = parseContractCreateInput({
        clientId: "client-1",
        reference: maxLengthRef,
        ...baseInput,
      });

      expect(result.reference).toBe(maxLengthRef);
    });

    it("rejects reference exceeding max length", () => {
      const tooLongRef = "A".repeat(CONTRACT_REFERENCE_MAX_LENGTH + 1);
      
      expect(() =>
        parseContractCreateInput({
          clientId: "client-1",
          reference: tooLongRef,
          ...baseInput,
        }),
      ).toThrow(InvalidContractInputError);
    });
  });

  describe("parseContractUpdateInput with reference", () => {
    it("updates reference", () => {
      const result = parseContractUpdateInput({
        reference: "Nuovo riferimento",
        ...baseInput,
      });

      expect(result.reference).toBe("Nuovo riferimento");
    });

    it("clears reference with empty string", () => {
      const result = parseContractUpdateInput({
        reference: "",
        ...baseInput,
      });

      expect(result.reference).toBeNull();
    });
  });
});
