// tests/unit/components/forms/field-association.test.ts
import {
  getFieldControlAssociation,
  getFieldDescribedBy,
  getFieldErrorId,
  getFieldHintId,
} from "@/components/forms/field-association";
import { describe, expect, it } from "vitest";

describe("field association helpers", () => {
  it("should build stable hint and error ids from the control id", () => {
    expect(getFieldHintId("email")).toBe("email-hint");
    expect(getFieldErrorId("email")).toBe("email-error");
  });

  it("should omit aria-describedby when there is no hint or error", () => {
    expect(getFieldDescribedBy("email", {})).toBeUndefined();
  });

  it("should associate hint and error ids when those messages exist", () => {
    expect(getFieldDescribedBy("email", { hint: "Work email" })).toBe(
      "email-hint",
    );
    expect(getFieldDescribedBy("email", { error: "Required" })).toBe(
      "email-error",
    );
    expect(
      getFieldDescribedBy("email", { hint: "Work email", error: "Required" }),
    ).toBe("email-hint email-error");
  });

  it("should mark the control invalid only when an error is present", () => {
    expect(getFieldControlAssociation("email", { hint: "Work email" })).toEqual(
      {
        id: "email",
        "aria-invalid": undefined,
        "aria-describedby": "email-hint",
      },
    );

    expect(getFieldControlAssociation("email", { error: "Required" })).toEqual({
      id: "email",
      "aria-invalid": true,
      "aria-describedby": "email-error",
    });
  });
});
