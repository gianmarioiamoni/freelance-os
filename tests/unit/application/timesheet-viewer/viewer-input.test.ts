// tests/unit/application/timesheet-viewer/viewer-input.test.ts
import { describe, expect, it } from "vitest";

import {
  parseAuthorizeContractInput,
  parseCreateAnomalyInput,
  parseInviteViewerInput,
  parseUpdateAnomalyInput,
} from "@/application/timesheet-viewer/viewer-input";
import { InvalidViewerInputError } from "@/domain/viewer-errors";

describe("parseInviteViewerInput", () => {
  it("accepts valid email with default expiry", () => {
    const result = parseInviteViewerInput({
      email: "viewer@example.com",
    });

    expect(result.email).toBe("viewer@example.com");
    expect(result.tokenExpiryHours).toBe(72);
  });

  it("normalizes email to lowercase", () => {
    const result = parseInviteViewerInput({
      email: "Viewer@Example.COM",
    });

    expect(result.email).toBe("viewer@example.com");
  });

  it("accepts custom token expiry hours", () => {
    const result = parseInviteViewerInput({
      email: "viewer@example.com",
      tokenExpiryHours: 24,
    });

    expect(result.tokenExpiryHours).toBe(24);
  });

  it("rejects empty email", () => {
    expect(() =>
      parseInviteViewerInput({ email: "" }),
    ).toThrow(InvalidViewerInputError);
  });

  it("rejects invalid email format", () => {
    expect(() =>
      parseInviteViewerInput({ email: "notanemail" }),
    ).toThrow(InvalidViewerInputError);
  });

  it("rejects token expiry too short", () => {
    expect(() =>
      parseInviteViewerInput({ email: "viewer@example.com", tokenExpiryHours: 0 }),
    ).toThrow(InvalidViewerInputError);
  });

  it("rejects token expiry too long", () => {
    expect(() =>
      parseInviteViewerInput({ email: "viewer@example.com", tokenExpiryHours: 200 }),
    ).toThrow(InvalidViewerInputError);
  });
});

describe("parseAuthorizeContractInput", () => {
  const validUuid = "550e8400-e29b-41d4-a716-446655440000";

  it("accepts valid input without display label", () => {
    const result = parseAuthorizeContractInput({
      viewerAccessId: validUuid,
      contractId: validUuid,
    });

    expect(result.viewerAccessId).toBe(validUuid);
    expect(result.contractId).toBe(validUuid);
    expect(result.displayLabel).toBeNull();
  });

  it("accepts valid input with display label", () => {
    const result = parseAuthorizeContractInput({
      viewerAccessId: validUuid,
      contractId: validUuid,
      displayLabel: "Project Alpha",
    });

    expect(result.displayLabel).toBe("Project Alpha");
  });

  it("trims display label", () => {
    const result = parseAuthorizeContractInput({
      viewerAccessId: validUuid,
      contractId: validUuid,
      displayLabel: "  Project Alpha  ",
    });

    expect(result.displayLabel).toBe("Project Alpha");
  });

  it("rejects invalid viewerAccessId UUID", () => {
    expect(() =>
      parseAuthorizeContractInput({
        viewerAccessId: "not-a-uuid",
        contractId: validUuid,
      }),
    ).toThrow(InvalidViewerInputError);
  });

  it("rejects invalid contractId UUID", () => {
    expect(() =>
      parseAuthorizeContractInput({
        viewerAccessId: validUuid,
        contractId: "not-a-uuid",
      }),
    ).toThrow(InvalidViewerInputError);
  });
});

describe("parseCreateAnomalyInput", () => {
  const validUuid = "550e8400-e29b-41d4-a716-446655440000";

  it("accepts valid anomaly input", () => {
    const workDate = new Date("2026-10-29");
    const result = parseCreateAnomalyInput({
      viewerAccessId: validUuid,
      workDate,
      message: "This time entry looks incorrect to me",
    });

    expect(result.viewerAccessId).toBe(validUuid);
    expect(result.workDate).toBe(workDate);
    expect(result.message).toBe("This time entry looks incorrect to me");
    expect(result.timeEntryId).toBeNull();
  });

  it("accepts optional timeEntryId", () => {
    const result = parseCreateAnomalyInput({
      viewerAccessId: validUuid,
      timeEntryId: validUuid,
      workDate: new Date("2026-10-29"),
      message: "This specific entry is wrong",
    });

    expect(result.timeEntryId).toBe(validUuid);
  });

  it("rejects message too short", () => {
    expect(() =>
      parseCreateAnomalyInput({
        viewerAccessId: validUuid,
        workDate: new Date("2026-10-29"),
        message: "Too short",
      }),
    ).toThrow(InvalidViewerInputError);
  });

  it("rejects message too long", () => {
    const longMessage = "x".repeat(2001);
    expect(() =>
      parseCreateAnomalyInput({
        viewerAccessId: validUuid,
        workDate: new Date("2026-10-29"),
        message: longMessage,
      }),
    ).toThrow(InvalidViewerInputError);
  });

  it("trims message whitespace", () => {
    const result = parseCreateAnomalyInput({
      viewerAccessId: validUuid,
      workDate: new Date("2026-10-29"),
      message: "  This entry looks incorrect  ",
    });

    expect(result.message).toBe("This entry looks incorrect");
  });
});

describe("parseUpdateAnomalyInput", () => {
  it("accepts valid freelance notes", () => {
    const result = parseUpdateAnomalyInput({
      freelanceNotes: "I will look into this issue",
    });

    expect(result.freelanceNotes).toBe("I will look into this issue");
  });

  it("accepts null freelance notes", () => {
    const result = parseUpdateAnomalyInput({
      freelanceNotes: null,
    });

    expect(result.freelanceNotes).toBeNull();
  });

  it("accepts empty object", () => {
    const result = parseUpdateAnomalyInput({});

    expect(result.freelanceNotes).toBeNull();
  });

  it("trims freelance notes", () => {
    const result = parseUpdateAnomalyInput({
      freelanceNotes: "  Looking into it  ",
    });

    expect(result.freelanceNotes).toBe("Looking into it");
  });

  it("rejects notes exceeding max length", () => {
    const longNotes = "x".repeat(4001);
    expect(() =>
      parseUpdateAnomalyInput({ freelanceNotes: longNotes }),
    ).toThrow(InvalidViewerInputError);
  });
});
