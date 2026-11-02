// tests/unit/infrastructure/resend-magic-link.test.ts
import { describe, expect, it } from "vitest";

import {
  getResendProductionConfig,
  deliverProductionMagicLinkEmail,
  PRODUCTION_EMAIL_UNCONFIGURED_MESSAGE,
  PRODUCTION_EMAIL_SENT_MESSAGE,
  type MagicLinkEmailPayload,
  type TransactionalEmailInput,
} from "@/infrastructure/email/resend-magic-link";

describe("resend magic link configuration", () => {
  it("returns undefined when api key is missing", () => {
    const config = getResendProductionConfig({ EMAIL_FROM: "test@example.com" });
    expect(config).toBeUndefined();
  });

  it("returns undefined when from address is missing", () => {
    const config = getResendProductionConfig({ RESEND_API_KEY: "test-key" });
    expect(config).toBeUndefined();
  });

  it("returns configuration when both values are present", () => {
    const config = getResendProductionConfig({
      RESEND_API_KEY: "test-key",
      EMAIL_FROM: "test@example.com",
    });
    expect(config).toEqual({
      apiKey: "test-key",
      from: "test@example.com",
    });
  });

  it("trims whitespace from configuration values", () => {
    const config = getResendProductionConfig({
      RESEND_API_KEY: "  test-key  ",
      EMAIL_FROM: "  test@example.com  ",
    });
    expect(config).toEqual({
      apiKey: "test-key",
      from: "test@example.com",
    });
  });
});

describe("resend magic link delivery", () => {
  it("skips delivery and logs warning when not configured", async () => {
    const data: MagicLinkEmailPayload = {
      email: "user@example.com",
      url: "https://example.com/magic-link?token=abc",
      token: "abc",
    };

    const result = await deliverProductionMagicLinkEmail(data, {});
    expect(result).toBe("skipped");
  });

  it("sends magic link email with viewer activation metadata", async () => {
    const data: MagicLinkEmailPayload = {
      email: "viewer@example.com",
      url: "https://example.com/magic-callback?token=xyz",
      token: "xyz",
      metadata: { type: "viewer-activation" },
    };

    let capturedInput: TransactionalEmailInput | null = null;
    const mockSend = async (input: TransactionalEmailInput) => {
      capturedInput = input;
    };

    const result = await deliverProductionMagicLinkEmail(
      data,
      {
        RESEND_API_KEY: "test-key",
        EMAIL_FROM: "noreply@example.com",
      },
      mockSend,
    );

    expect(result).toBe("sent");
    expect(capturedInput).toBeTruthy();
    expect(capturedInput?.to).toBe("viewer@example.com");
    expect(capturedInput?.subject).toBe("Access Your Timesheet Dashboard");
    expect(capturedInput?.text).toContain("timesheet viewer dashboard");
    expect(capturedInput?.text).toContain(data.url);
  });

  it("sends magic link email for viewer login", async () => {
    const data: MagicLinkEmailPayload = {
      email: "viewer@example.com",
      url: "https://example.com/access-selector?token=xyz",
      token: "xyz",
      metadata: { type: "viewer-login" },
    };

    let capturedInput: TransactionalEmailInput | null = null;
    const mockSend = async (input: TransactionalEmailInput) => {
      capturedInput = input;
    };

    const result = await deliverProductionMagicLinkEmail(
      data,
      {
        RESEND_API_KEY: "test-key",
        EMAIL_FROM: "noreply@example.com",
      },
      mockSend,
    );

    expect(result).toBe("sent");
    expect(capturedInput?.subject).toBe("Sign in to FreelanceOS");
    expect(capturedInput?.text).toContain("sign in to FreelanceOS");
  });

  it("returns skipped when send fails", async () => {
    const data: MagicLinkEmailPayload = {
      email: "fail@example.com",
      url: "https://example.com/magic-link?token=fail",
      token: "fail",
    };

    const mockSend = async () => {
      throw new Error("Network error");
    };

    const result = await deliverProductionMagicLinkEmail(
      data,
      {
        RESEND_API_KEY: "test-key",
        EMAIL_FROM: "noreply@example.com",
      },
      mockSend,
    );

    expect(result).toBe("skipped");
  });
});
