// tests/unit/infrastructure/resend-viewer-invite.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  deliverProductionViewerInviteEmail,
  getResendProductionConfig,
  INVITE_EMAIL_UNCONFIGURED_MESSAGE,
  INVITE_EMAIL_SENT_MESSAGE,
  INVITE_EMAIL_FAILED_MESSAGE,
  type ViewerInviteEmailPayload,
  type SendTransactionalEmail,
} from "@/infrastructure/email/resend-viewer-invite";

describe("resend-viewer-invite", () => {
  describe("getResendProductionConfig", () => {
    it("returns config when RESEND_API_KEY and EMAIL_FROM are set", () => {
      const env = {
        RESEND_API_KEY: "re_test_key",
        EMAIL_FROM: "noreply@example.com",
      };

      const config = getResendProductionConfig(env);

      expect(config).toEqual({
        apiKey: "re_test_key",
        from: "noreply@example.com",
      });
    });

    it("returns undefined when RESEND_API_KEY is missing", () => {
      const env = { EMAIL_FROM: "noreply@example.com" };

      const config = getResendProductionConfig(env);

      expect(config).toBeUndefined();
    });

    it("returns undefined when EMAIL_FROM is missing", () => {
      const env = { RESEND_API_KEY: "re_test_key" };

      const config = getResendProductionConfig(env);

      expect(config).toBeUndefined();
    });

    it("trims whitespace from credentials", () => {
      const env = {
        RESEND_API_KEY: "  re_test_key  ",
        EMAIL_FROM: "  noreply@example.com  ",
      };

      const config = getResendProductionConfig(env);

      expect(config).toEqual({
        apiKey: "re_test_key",
        from: "noreply@example.com",
      });
    });
  });

  describe("deliverProductionViewerInviteEmail", () => {
    let consoleWarnSpy: ReturnType<typeof vi.spyOn>;
    let consoleInfoSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      consoleInfoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
    });

    it('returns "skipped" when Resend is not configured', async () => {
      const payload: ViewerInviteEmailPayload = {
        email: "viewer@example.com",
        inviteUrl: "https://app.example.com/viewer-activate?token=abc123",
        expiresAt: new Date("2026-12-31T23:59:59Z"),
      };

      const result = await deliverProductionViewerInviteEmail(payload, {});

      expect(result).toBe("skipped");
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        INVITE_EMAIL_UNCONFIGURED_MESSAGE,
      );
    });

    it('returns "sent" when email is successfully sent', async () => {
      const env = {
        RESEND_API_KEY: "re_test_key",
        EMAIL_FROM: "noreply@example.com",
      };
      const payload: ViewerInviteEmailPayload = {
        email: "viewer@example.com",
        inviteUrl: "https://app.example.com/viewer-activate?token=abc123",
        expiresAt: new Date("2026-12-31T23:59:59Z"),
      };

      const mockSend: SendTransactionalEmail = vi.fn(async () => {});

      const result = await deliverProductionViewerInviteEmail(
        payload,
        env,
        mockSend,
      );

      expect(result).toBe("sent");
      expect(mockSend).toHaveBeenCalledWith({
        from: "noreply@example.com",
        to: "viewer@example.com",
        subject: "Timesheet Viewer Invitation",
        text: expect.stringContaining("You've been invited to view timesheets"),
      });
      expect(consoleInfoSpy).toHaveBeenCalledWith(INVITE_EMAIL_SENT_MESSAGE);
    });

    it('returns "skipped" when email sending fails', async () => {
      const env = {
        RESEND_API_KEY: "re_test_key",
        EMAIL_FROM: "noreply@example.com",
      };
      const payload: ViewerInviteEmailPayload = {
        email: "viewer@example.com",
        inviteUrl: "https://app.example.com/viewer-activate?token=abc123",
        expiresAt: new Date("2026-12-31T23:59:59Z"),
      };

      const mockSend: SendTransactionalEmail = vi.fn(async () => {
        throw new Error("Resend API error");
      });

      const result = await deliverProductionViewerInviteEmail(
        payload,
        env,
        mockSend,
      );

      expect(result).toBe("skipped");
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        INVITE_EMAIL_FAILED_MESSAGE,
        expect.any(Error),
      );
    });

    it("includes workspace name in email text when provided", async () => {
      const env = {
        RESEND_API_KEY: "re_test_key",
        EMAIL_FROM: "noreply@example.com",
      };
      const payload: ViewerInviteEmailPayload = {
        email: "viewer@example.com",
        inviteUrl: "https://app.example.com/viewer-activate?token=abc123",
        workspaceName: "Acme Corp",
        expiresAt: new Date("2026-12-31T23:59:59Z"),
      };

      const mockSend: SendTransactionalEmail = vi.fn(async () => {});

      await deliverProductionViewerInviteEmail(payload, env, mockSend);

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining("Acme Corp"),
        }),
      );
    });

    it("includes invitation URL in email text", async () => {
      const env = {
        RESEND_API_KEY: "re_test_key",
        EMAIL_FROM: "noreply@example.com",
      };
      const inviteUrl = "https://app.example.com/viewer-activate?token=xyz789";
      const payload: ViewerInviteEmailPayload = {
        email: "viewer@example.com",
        inviteUrl,
        expiresAt: new Date("2026-12-31T23:59:59Z"),
      };

      const mockSend: SendTransactionalEmail = vi.fn(async () => {});

      await deliverProductionViewerInviteEmail(payload, env, mockSend);

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining(inviteUrl),
        }),
      );
    });

    it("includes expiry date in email text", async () => {
      const env = {
        RESEND_API_KEY: "re_test_key",
        EMAIL_FROM: "noreply@example.com",
      };
      const expiresAt = new Date("2026-12-31T23:59:59Z");
      const payload: ViewerInviteEmailPayload = {
        email: "viewer@example.com",
        inviteUrl: "https://app.example.com/viewer-activate?token=abc123",
        expiresAt,
      };

      const mockSend: SendTransactionalEmail = vi.fn(async () => {});

      await deliverProductionViewerInviteEmail(payload, env, mockSend);

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining("expires"),
        }),
      );
    });
  });
});
