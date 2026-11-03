// tests/unit/infrastructure/auth-magic-link-flag.test.ts
import { describe, expect, it } from "vitest";

describe("Magic Link feature flag", () => {
  it("is enabled by default when ENABLE_MAGIC_LINK is undefined", () => {
    const env = {};
    const flag = env.ENABLE_MAGIC_LINK?.toLowerCase();
    const enabled = flag !== "false" && flag !== "0";
    expect(enabled).toBe(true);
  });

  it("is enabled when ENABLE_MAGIC_LINK is true", () => {
    const env = { ENABLE_MAGIC_LINK: "true" };
    const flag = env.ENABLE_MAGIC_LINK?.toLowerCase();
    const enabled = flag !== "false" && flag !== "0";
    expect(enabled).toBe(true);
  });

  it("is disabled when ENABLE_MAGIC_LINK is false", () => {
    const env = { ENABLE_MAGIC_LINK: "false" };
    const flag = env.ENABLE_MAGIC_LINK?.toLowerCase();
    const enabled = flag !== "false" && flag !== "0";
    expect(enabled).toBe(false);
  });

  it("is disabled when ENABLE_MAGIC_LINK is 0", () => {
    const env = { ENABLE_MAGIC_LINK: "0" };
    const flag = env.ENABLE_MAGIC_LINK?.toLowerCase();
    const enabled = flag !== "false" && flag !== "0";
    expect(enabled).toBe(false);
  });
});
