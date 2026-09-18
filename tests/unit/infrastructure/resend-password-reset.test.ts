// tests/unit/infrastructure/resend-password-reset.test.ts
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  PRODUCTION_EMAIL_FAILED_MESSAGE,
  PRODUCTION_EMAIL_SENT_MESSAGE,
  PRODUCTION_EMAIL_UNCONFIGURED_MESSAGE,
  deliverProductionPasswordResetEmail,
  getResendProductionConfig,
} from "@/infrastructure/email/resend-password-reset";

const payload = {
  user: { id: "user-1", email: "reset@example.com" },
  url: "http://localhost:3000/reset-password?token=secret-token",
  token: "secret-token",
};

describe("Resend production password-reset delivery", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("requires both RESEND_API_KEY and AUTH_EMAIL_FROM", () => {
    expect(getResendProductionConfig({})).toBeUndefined();
    expect(
      getResendProductionConfig({
        RESEND_API_KEY: "re_test",
      }),
    ).toBeUndefined();
    expect(
      getResendProductionConfig({
        AUTH_EMAIL_FROM: "FreelanceOS <noreply@example.com>",
      }),
    ).toBeUndefined();
    expect(
      getResendProductionConfig({
        RESEND_API_KEY: " re_test ",
        AUTH_EMAIL_FROM: " FreelanceOS <noreply@example.com> ",
      }),
    ).toEqual({
      apiKey: "re_test",
      from: "FreelanceOS <noreply@example.com>",
    });
  });

  it("skips sending and does not log the reset URL when unconfigured", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const send = vi.fn();

    await expect(
      deliverProductionPasswordResetEmail(payload, {}, send),
    ).resolves.toBe("skipped");

    expect(send).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledWith(PRODUCTION_EMAIL_UNCONFIGURED_MESSAGE);
    expect(warn.mock.calls.flat().join(" ")).not.toContain(payload.url);
    expect(warn.mock.calls.flat().join(" ")).not.toContain(payload.token);
  });

  it("sends through the transactional adapter without logging secrets", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const send = vi.fn().mockResolvedValue(undefined);

    await expect(
      deliverProductionPasswordResetEmail(
        payload,
        {
          RESEND_API_KEY: "re_test",
          AUTH_EMAIL_FROM: "FreelanceOS <noreply@example.com>",
        },
        send,
      ),
    ).resolves.toBe("sent");

    expect(send).toHaveBeenCalledWith(
      {
        from: "FreelanceOS <noreply@example.com>",
        to: "reset@example.com",
        subject: "Reset your FreelanceOS password",
        text: expect.stringContaining(payload.url),
      },
      "re_test",
    );
    expect(info).toHaveBeenCalledWith(PRODUCTION_EMAIL_SENT_MESSAGE);
    expect(info.mock.calls.flat().join(" ")).not.toContain(payload.url);
    expect(info.mock.calls.flat().join(" ")).not.toContain(payload.token);
  });

  it("warns without secrets when Resend fails", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const send = vi.fn().mockRejectedValue(new Error("network"));

    await expect(
      deliverProductionPasswordResetEmail(
        payload,
        {
          RESEND_API_KEY: "re_test",
          AUTH_EMAIL_FROM: "FreelanceOS <noreply@example.com>",
        },
        send,
      ),
    ).resolves.toBe("skipped");

    expect(warn).toHaveBeenCalledWith(PRODUCTION_EMAIL_FAILED_MESSAGE);
    expect(warn.mock.calls.flat().join(" ")).not.toContain(payload.url);
    expect(warn.mock.calls.flat().join(" ")).not.toContain(payload.token);
  });
});
