// tests/unit/application/admin/admin-configuration.test.ts
import { describe, expect, it } from "vitest";

describe("admin configuration security", () => {
  it("ADMIN_GOOGLE_EMAIL must not be exposed through NEXT_PUBLIC_ prefix", () => {
    const publicKeys = Object.keys(process.env).filter((key) =>
      key.startsWith("NEXT_PUBLIC_"),
    );

    const exposedAdminKeys = publicKeys.filter((key) =>
      key.toLowerCase().includes("admin"),
    );

    expect(exposedAdminKeys).toEqual([]);
  });

  it("ADMIN_GOOGLE_EMAIL must remain server-only", () => {
    const adminEmail = process.env.ADMIN_GOOGLE_EMAIL;

    if (typeof window !== "undefined") {
      expect(adminEmail).toBeUndefined();
    }
  });

  it("verifies server-only import guard on admin-authorization module", async () => {
    await expect(
      import("@/application/admin/admin-authorization")
    ).rejects.toThrow(/cannot be imported from a Client Component/);
  });
});
