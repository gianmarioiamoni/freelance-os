// tests/unit/infrastructure/auth-email-delivery-mode.test.ts
import { describe, expect, it } from "vitest";

import { resolveAuthEmailDeliveryMode } from "@/infrastructure/email/auth-email-delivery-mode";

describe("auth email delivery mode", () => {
  it("prefers AUTH_EMAIL_DELIVERY when it is an explicit mode", () => {
    expect(
      resolveAuthEmailDeliveryMode({
        AUTH_EMAIL_DELIVERY: "test",
        NODE_ENV: "production",
      }),
    ).toBe("test");
    expect(
      resolveAuthEmailDeliveryMode({
        AUTH_EMAIL_DELIVERY: "development",
        NODE_ENV: "production",
      }),
    ).toBe("development");
    expect(
      resolveAuthEmailDeliveryMode({
        AUTH_EMAIL_DELIVERY: "production",
        NODE_ENV: "development",
      }),
    ).toBe("production");
  });

  it("uses test in NODE_ENV=test and production in NODE_ENV=production", () => {
    expect(resolveAuthEmailDeliveryMode({ NODE_ENV: "test" })).toBe("test");
    expect(resolveAuthEmailDeliveryMode({ NODE_ENV: "production" })).toBe(
      "production",
    );
    expect(resolveAuthEmailDeliveryMode({ NODE_ENV: "development" })).toBe(
      "development",
    );
  });

  it("does not treat an unknown AUTH_EMAIL_DELIVERY value as production email", () => {
    expect(
      resolveAuthEmailDeliveryMode({
        AUTH_EMAIL_DELIVERY: "smtp",
        NODE_ENV: "development",
      }),
    ).toBe("development");
  });
});
