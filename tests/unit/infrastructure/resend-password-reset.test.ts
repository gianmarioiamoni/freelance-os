// tests/unit/infrastructure/resend-password-reset.test.ts
import { readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  PRODUCTION_EMAIL_FAILED_MESSAGE,
  PRODUCTION_EMAIL_SENT_MESSAGE,
  PRODUCTION_EMAIL_UNCONFIGURED_MESSAGE,
  deliverProductionPasswordResetEmail,
  getResendProductionConfig,
  sendViaResend,
} from "@/infrastructure/email/resend-password-reset";

const payload = {
  user: { id: "user-1", email: "reset@example.com" },
  url: "http://localhost:3000/reset-password?token=secret-token",
  token: "secret-token",
};

const RESEND_API_KEY_FIXTURE = "re_test_api_key_1234567890";

const completeResendEnv = {
  RESEND_API_KEY: RESEND_API_KEY_FIXTURE,
  EMAIL_FROM: "sender@example.com",
};

const expectedText = [
  "Use the following link to reset your password.",
  "The link expires in one hour.",
  "",
  payload.url,
].join("\n");

const { Resend, send } = vi.hoisted(() => {
  const send = vi.fn();
  function MockResend(this: { emails: { send: typeof send } }) {
    this.emails = { send };
  }
  const Resend = vi.fn(MockResend);
  return { Resend, send };
});

vi.mock("resend", () => ({
  Resend,
}));

describe("Resend production password-reset delivery", () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it("requires RESEND_API_KEY and EMAIL_FROM", () => {
    expect(getResendProductionConfig({})).toBeUndefined();
    expect(
      getResendProductionConfig({
        ...completeResendEnv,
        RESEND_API_KEY: "",
      }),
    ).toBeUndefined();
    expect(
      getResendProductionConfig({
        ...completeResendEnv,
        EMAIL_FROM: "",
      }),
    ).toBeUndefined();
    expect(
      getResendProductionConfig({
        RESEND_API_KEY: ` ${RESEND_API_KEY_FIXTURE} `,
        EMAIL_FROM: " sender@example.com ",
      }),
    ).toEqual({
      apiKey: RESEND_API_KEY_FIXTURE,
      from: "sender@example.com",
    });
  });

  it("skips sending and does not log secrets when unconfigured", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const sendFn = vi.fn();

    await expect(
      deliverProductionPasswordResetEmail(payload, {}, sendFn),
    ).resolves.toBe("skipped");

    expect(sendFn).not.toHaveBeenCalled();
    expect(Resend).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledWith(PRODUCTION_EMAIL_UNCONFIGURED_MESSAGE);
    expect(warn.mock.calls.flat().join(" ")).not.toContain(payload.url);
    expect(warn.mock.calls.flat().join(" ")).not.toContain(payload.token);
    expect(warn.mock.calls.flat().join(" ")).not.toContain(RESEND_API_KEY_FIXTURE);
    expect(warn.mock.calls.flat().join(" ")).not.toMatch(/SMTP/i);
    expect(warn.mock.calls.flat().join(" ")).not.toMatch(/Nodemailer/i);
  });

  it("sends through the transactional adapter without logging secrets", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const sendFn = vi.fn().mockResolvedValue(undefined);

    await expect(
      deliverProductionPasswordResetEmail(payload, completeResendEnv, sendFn),
    ).resolves.toBe("sent");

    expect(sendFn).toHaveBeenCalledWith({
      from: "sender@example.com",
      to: "reset@example.com",
      subject: "Reset your FreelanceOS password",
      text: expectedText,
    });
    expect(sendFn.mock.calls.flat(2).join(" ")).not.toContain(RESEND_API_KEY_FIXTURE);
    expect(Resend).not.toHaveBeenCalled();
    expect(info).toHaveBeenCalledWith(PRODUCTION_EMAIL_SENT_MESSAGE);
    expect(info.mock.calls.flat().join(" ")).not.toContain(payload.url);
    expect(info.mock.calls.flat().join(" ")).not.toContain(payload.token);
    expect(info.mock.calls.flat().join(" ")).not.toContain(RESEND_API_KEY_FIXTURE);
    expect(info.mock.calls.flat().join(" ")).not.toMatch(/SMTP/i);
    expect(info.mock.calls.flat().join(" ")).not.toMatch(/Nodemailer/i);
  });

  it("calls Resend with API key and email data", async () => {
    send.mockResolvedValue(undefined);
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);

    await expect(
      deliverProductionPasswordResetEmail(payload, completeResendEnv),
    ).resolves.toBe("sent");

    expect(Resend).toHaveBeenCalledWith(RESEND_API_KEY_FIXTURE);
    expect(send).toHaveBeenCalledWith({
      from: "sender@example.com",
      to: "reset@example.com",
      subject: "Reset your FreelanceOS password",
      text: expectedText,
    });
    expect(info).toHaveBeenCalledWith(PRODUCTION_EMAIL_SENT_MESSAGE);
    expect(info.mock.calls.flat().join(" ")).not.toContain(RESEND_API_KEY_FIXTURE);
  });

  it("warns without secrets when Resend fails", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const sendFn = vi.fn().mockRejectedValue(new Error("network"));

    await expect(
      deliverProductionPasswordResetEmail(payload, completeResendEnv, sendFn),
    ).resolves.toBe("skipped");

    expect(warn).toHaveBeenCalledWith(PRODUCTION_EMAIL_FAILED_MESSAGE);
    expect(warn.mock.calls.flat().join(" ")).not.toContain(payload.url);
    expect(warn.mock.calls.flat().join(" ")).not.toContain(payload.token);
    expect(warn.mock.calls.flat().join(" ")).not.toContain(RESEND_API_KEY_FIXTURE);
    expect(warn.mock.calls.flat().join(" ")).not.toMatch(/SMTP/i);
    expect(warn.mock.calls.flat().join(" ")).not.toMatch(/Nodemailer/i);
  });

  it("exposes sendViaResend for the Resend client", async () => {
    send.mockResolvedValue(undefined);
    const config = getResendProductionConfig(completeResendEnv);

    expect(config).toBeDefined();
    if (!config) {
      return;
    }

    await sendViaResend(
      {
        from: config.from,
        to: payload.user.email,
        subject: "Reset your FreelanceOS password",
        text: expectedText,
      },
      config,
    );

    expect(Resend).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledTimes(1);
  });
});

describe("Resend module security", () => {
  it("keeps Resend server-only and uses EMAIL_FROM", () => {
    const resendSource = readFileSync(
      path.join(process.cwd(), "src/infrastructure/email/resend-password-reset.ts"),
      "utf8",
    );
    const packageJson = readFileSync(
      path.join(process.cwd(), "package.json"),
      "utf8",
    );

    expect(resendSource).toMatch(/import ["']server-only["']/);
    expect(resendSource).toMatch(/from ["']resend["']/);
    expect(resendSource).toMatch(/EMAIL_FROM/);
    expect(resendSource).toMatch(/RESEND_API_KEY/);
    expect(resendSource).not.toMatch(/NEXT_PUBLIC_/);
    expect(resendSource).not.toMatch(/nodemailer/i);
    expect(resendSource).not.toMatch(/SMTP_/);
    expect(resendSource).not.toMatch(/AUTH_EMAIL_FROM/);
    expect(packageJson).toMatch(/"resend"/);
  });
});
