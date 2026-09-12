// tests/unit/application/workspace/workspace-creation-input.test.ts
import { describe, expect, it } from "vitest";

import {
  parseWorkspaceCreationInput,
  WORKSPACE_NAME_MAX_LENGTH,
} from "@/application/workspace/workspace-creation-input";
import { InvalidWorkspaceCreationInputError } from "@/domain/workspace-errors";

const validInput = {
  name: "Studio Iamoni",
  timezone: "Europe/Rome",
  currency: "EUR",
};

function expectInvalidField(
  input: typeof validInput,
  field: "name" | "timezone" | "currency",
): void {
  try {
    parseWorkspaceCreationInput(input);
    throw new Error("expected validation to fail");
  } catch (error) {
    expect(error).toBeInstanceOf(InvalidWorkspaceCreationInputError);
    expect((error as InvalidWorkspaceCreationInputError).field).toBe(field);
  }
}

describe("parseWorkspaceCreationInput", () => {
  it("accepts valid workspace creation input", () => {
    expect(parseWorkspaceCreationInput(validInput)).toEqual(validInput);
  });

  it("trims the workspace name", () => {
    expect(
      parseWorkspaceCreationInput({
        ...validInput,
        name: "  Studio Iamoni  ",
      }),
    ).toEqual(validInput);
  });

  it("rejects an empty or whitespace-only name", () => {
    expectInvalidField({ ...validInput, name: "" }, "name");
    expectInvalidField({ ...validInput, name: "   " }, "name");
  });

  it("rejects a name longer than the technical maximum", () => {
    expectInvalidField(
      {
        ...validInput,
        name: "A".repeat(WORKSPACE_NAME_MAX_LENGTH + 1),
      },
      "name",
    );
  });

  it("rejects an invalid IANA timezone", () => {
    expectInvalidField({ ...validInput, timezone: "Not/A_Timezone" }, "timezone");
  });

  it("rejects an invalid ISO-4217 currency", () => {
    expectInvalidField({ ...validInput, currency: "EURO" }, "currency");
  });

  it("normalizes a valid currency to uppercase", () => {
    expect(
      parseWorkspaceCreationInput({
        ...validInput,
        currency: "eur",
      }),
    ).toEqual(validInput);
  });
});
