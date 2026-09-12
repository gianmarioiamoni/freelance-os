// tests/unit/application/clients/client-input.test.ts
import { describe, expect, it } from "vitest";

import {
  COMPANY_NAME_MAX_LENGTH,
  parseClientWriteInput,
} from "@/application/clients/client-input";
import { InvalidClientInputError } from "@/domain/client-errors";

const validCreateInput = {
  companyName: "Acme Studio",
  vatNumber: "IT12345678901",
  taxCode: "ACMSTD80A01H501Z",
  address: "Via Roma 1",
  contactName: "Ada Lovelace",
  email: "ada@acme.test",
  phone: "+39 011 000000",
  notes: "Preferred client",
};

const validUpdateInput = {
  companyName: "Acme Studio Updated",
  vatNumber: "IT99999999999",
  taxCode: "UPDSTD80A01H501Z",
  address: "Via Torino 2",
  contactName: "Grace Hopper",
  email: "grace@acme.test",
  phone: "+39 011 111111",
  notes: "Updated notes",
};

function expectInvalidField(
  input: Parameters<typeof parseClientWriteInput>[0],
  field: InvalidClientInputError["field"],
): void {
  try {
    parseClientWriteInput(input);
    throw new Error("expected validation to fail");
  } catch (error) {
    expect(error).toBeInstanceOf(InvalidClientInputError);
    expect((error as InvalidClientInputError).field).toBe(field);
  }
}

describe("parseClientWriteInput", () => {
  it("accepts valid create input", () => {
    expect(parseClientWriteInput(validCreateInput)).toEqual(validCreateInput);
  });

  it("accepts valid update input", () => {
    expect(parseClientWriteInput(validUpdateInput)).toEqual(validUpdateInput);
  });

  it("rejects a missing companyName", () => {
    expectInvalidField(
      { ...validCreateInput, companyName: undefined as unknown as string },
      "companyName",
    );
  });

  it("rejects a blank companyName", () => {
    expectInvalidField({ ...validCreateInput, companyName: "" }, "companyName");
    expectInvalidField({ ...validCreateInput, companyName: "   " }, "companyName");
  });

  it("trims companyName and optional fields", () => {
    expect(
      parseClientWriteInput({
        companyName: "  Acme Studio  ",
        vatNumber: "  IT12345678901  ",
        taxCode: "  ACMSTD80A01H501Z  ",
        address: "  Via Roma 1  ",
        contactName: "  Ada Lovelace  ",
        email: "  ada@acme.test  ",
        phone: "  +39 011 000000  ",
        notes: "  Preferred client  ",
      }),
    ).toEqual(validCreateInput);
  });

  it("turns optional blank fields into null", () => {
    expect(
      parseClientWriteInput({
        companyName: "Acme Studio",
        vatNumber: "   ",
        taxCode: "",
        address: " ",
        contactName: null,
        email: undefined,
        phone: "",
        notes: "   ",
      }),
    ).toEqual({
      companyName: "Acme Studio",
      vatNumber: null,
      taxCode: null,
      address: null,
      contactName: null,
      email: null,
      phone: null,
      notes: null,
    });
  });

  it("rejects an invalid email", () => {
    expectInvalidField({ ...validCreateInput, email: "ada" }, "email");
    expectInvalidField({ ...validCreateInput, email: "ada@" }, "email");
    expectInvalidField({ ...validCreateInput, email: "@acme.test" }, "email");
    expectInvalidField({ ...validCreateInput, email: "ada@acme@test" }, "email");
  });

  it("rejects a companyName longer than the technical maximum", () => {
    expectInvalidField(
      {
        ...validCreateInput,
        companyName: "A".repeat(COMPANY_NAME_MAX_LENGTH + 1),
      },
      "companyName",
    );
  });

  it("does not accept status or workspaceId from the write input", () => {
    const parsed = parseClientWriteInput({
      ...validCreateInput,
      status: "ARCHIVED",
      workspaceId: "workspace-from-form",
    } as typeof validCreateInput);

    expect(parsed).toEqual(validCreateInput);
    expect(parsed).not.toHaveProperty("status");
    expect(parsed).not.toHaveProperty("workspaceId");
  });
});
