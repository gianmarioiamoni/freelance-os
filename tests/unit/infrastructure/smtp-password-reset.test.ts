// tests/unit/infrastructure/smtp-password-reset.test.ts
import { readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  PRODUCTION_EMAIL_FAILED_MESSAGE,
  PRODUCTION_EMAIL_SENT_MESSAGE,
  PRODUCTION_EMAIL_UNCONFIGURED_MESSAGE,
  deliverProductionPasswordResetEmail,
  getSmtpProductionConfig,
  sendViaSmtp,
} from "@/infrastructure/email/smtp-password-reset";

const payload = {
  user: { id: "user-1", email: "reset@example.com" },
  url: "http://localhost:3000/reset-password?token=secret-token",
  token: "secret-token",
};

const SMTP_PASSWORD_FIXTURE = "smtp-test-password";

const completeSmtpEnv = {
  SMTP_HOST: "smtp.gmail.com",
  SMTP_PORT: "465",
  SMTP_SECURE: "true",
  SMTP_USER: "sender@example.com",
  SMTP_PASSWORD: SMTP_PASSWORD_FIXTURE,
};

const expectedText = [
  "Use the following link to reset your password.",
  "The link expires in one hour.",
  "",
  payload.url,
].join("\n");

const { createTransport, sendMail } = vi.hoisted(() => {
  const sendMail = vi.fn();
  const createTransport = vi.fn(() => ({ sendMail }));
  return { createTransport, sendMail };
});

vi.mock("nodemailer", () => ({
  default: {
    createTransport,
  },
}));

describe("SMTP production password-reset delivery", () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it("requires every SMTP environment variable", () => {
    expect(getSmtpProductionConfig({})).toBeUndefined();
    expect(
      getSmtpProductionConfig({
        ...completeSmtpEnv,
        SMTP_HOST: "",
      }),
    ).toBeUndefined();
    expect(
      getSmtpProductionConfig({
        ...completeSmtpEnv,
        SMTP_PORT: "abc",
      }),
    ).toBeUndefined();
    expect(
      getSmtpProductionConfig({
        ...completeSmtpEnv,
        SMTP_SECURE: "yes",
      }),
    ).toBeUndefined();
    expect(
      getSmtpProductionConfig({
        ...completeSmtpEnv,
        SMTP_USER: "",
      }),
    ).toBeUndefined();
    expect(
      getSmtpProductionConfig({
        ...completeSmtpEnv,
        SMTP_PASSWORD: "",
      }),
    ).toBeUndefined();
    expect(
      getSmtpProductionConfig({
        SMTP_HOST: " smtp.gmail.com ",
        SMTP_PORT: " 465 ",
        SMTP_SECURE: " true ",
        SMTP_USER: " sender@example.com ",
        SMTP_PASSWORD: ` ${SMTP_PASSWORD_FIXTURE} `,
      }),
    ).toEqual({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      user: "sender@example.com",
      password: SMTP_PASSWORD_FIXTURE,
    });
  });

  it("skips sending and does not log secrets when unconfigured", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const send = vi.fn();

    await expect(
      deliverProductionPasswordResetEmail(payload, {}, send),
    ).resolves.toBe("skipped");

    expect(send).not.toHaveBeenCalled();
    expect(createTransport).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledWith(PRODUCTION_EMAIL_UNCONFIGURED_MESSAGE);
    expect(warn.mock.calls.flat().join(" ")).not.toContain(payload.url);
    expect(warn.mock.calls.flat().join(" ")).not.toContain(payload.token);
    expect(warn.mock.calls.flat().join(" ")).not.toContain(SMTP_PASSWORD_FIXTURE);
    expect(warn.mock.calls.flat().join(" ")).not.toMatch(/Resend/i);
  });

  it("sends through the transactional adapter without logging secrets", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const send = vi.fn().mockResolvedValue(undefined);

    await expect(
      deliverProductionPasswordResetEmail(payload, completeSmtpEnv, send),
    ).resolves.toBe("sent");

    expect(send).toHaveBeenCalledWith({
      from: "sender@example.com",
      to: "reset@example.com",
      subject: "Reset your FreelanceOS password",
      text: expectedText,
    });
    expect(send.mock.calls.flat(2).join(" ")).not.toContain(SMTP_PASSWORD_FIXTURE);
    expect(createTransport).not.toHaveBeenCalled();
    expect(info).toHaveBeenCalledWith(PRODUCTION_EMAIL_SENT_MESSAGE);
    expect(info.mock.calls.flat().join(" ")).not.toContain(payload.url);
    expect(info.mock.calls.flat().join(" ")).not.toContain(payload.token);
    expect(info.mock.calls.flat().join(" ")).not.toContain(SMTP_PASSWORD_FIXTURE);
    expect(info.mock.calls.flat().join(" ")).not.toMatch(/Resend/i);
  });

  it("calls Nodemailer with host, port, secure, and auth", async () => {
    sendMail.mockResolvedValue(undefined);
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);

    await expect(
      deliverProductionPasswordResetEmail(payload, completeSmtpEnv),
    ).resolves.toBe("sent");

    expect(createTransport).toHaveBeenCalledWith({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        user: "sender@example.com",
        pass: SMTP_PASSWORD_FIXTURE,
      },
    });
    expect(sendMail).toHaveBeenCalledWith({
      from: "sender@example.com",
      to: "reset@example.com",
      subject: "Reset your FreelanceOS password",
      text: expectedText,
    });
    expect(info).toHaveBeenCalledWith(PRODUCTION_EMAIL_SENT_MESSAGE);
    expect(info.mock.calls.flat().join(" ")).not.toContain(SMTP_PASSWORD_FIXTURE);
  });

  it("warns without secrets when SMTP fails", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const send = vi.fn().mockRejectedValue(new Error("network"));

    await expect(
      deliverProductionPasswordResetEmail(payload, completeSmtpEnv, send),
    ).resolves.toBe("skipped");

    expect(warn).toHaveBeenCalledWith(PRODUCTION_EMAIL_FAILED_MESSAGE);
    expect(warn.mock.calls.flat().join(" ")).not.toContain(payload.url);
    expect(warn.mock.calls.flat().join(" ")).not.toContain(payload.token);
    expect(warn.mock.calls.flat().join(" ")).not.toContain(SMTP_PASSWORD_FIXTURE);
    expect(warn.mock.calls.flat().join(" ")).not.toMatch(/Resend/i);
  });

  it("exposes sendViaSmtp for the Nodemailer transport", async () => {
    sendMail.mockResolvedValue(undefined);
    const config = getSmtpProductionConfig(completeSmtpEnv);

    expect(config).toBeDefined();
    if (!config) {
      return;
    }

    await sendViaSmtp(
      {
        from: config.user,
        to: payload.user.email,
        subject: "Reset your FreelanceOS password",
        text: expectedText,
      },
      config,
    );

    expect(createTransport).toHaveBeenCalledTimes(1);
    expect(sendMail).toHaveBeenCalledTimes(1);
  });
});

describe("SMTP module security", () => {
  it("keeps Nodemailer server-only and drops Resend", () => {
    const smtpSource = readFileSync(
      path.join(process.cwd(), "src/infrastructure/email/smtp-password-reset.ts"),
      "utf8",
    );
    const packageJson = readFileSync(
      path.join(process.cwd(), "package.json"),
      "utf8",
    );

    expect(smtpSource).toMatch(/import ["']server-only["']/);
    expect(smtpSource).toMatch(/from ["']nodemailer["']/);
    expect(smtpSource).not.toMatch(/NEXT_PUBLIC_/);
    expect(smtpSource).not.toMatch(/resend/i);
    expect(smtpSource).not.toMatch(/RESEND_API_KEY/);
    expect(smtpSource).not.toMatch(/AUTH_EMAIL_FROM/);
    expect(packageJson).toMatch(/"nodemailer"/);
    expect(packageJson).not.toMatch(/"resend"/);
  });
});
