// tests/unit/application/ai/sanitize-tool-args.test.ts
import { describe, expect, it } from "vitest";

import { sanitizeToolArgs } from "@/application/ai/sanitize-tool-args";

describe("sanitizeToolArgs", () => {
  it("drops workspaceId, userId, and role even if listed as extra keys", () => {
    const sanitized = sanitizeToolArgs(
      {
        workspaceId: "workspace-foreign",
        userId: "attacker",
        role: "OWNER",
        clientId: "client-1",
        extra: "ignored",
      },
      ["clientId"],
    );

    expect(sanitized.args).toEqual({ clientId: "client-1" });
    expect(sanitized.strippedKeys).toEqual(
      expect.arrayContaining(["workspaceId", "userId", "role", "extra"]),
    );
  });

  it("returns empty args for non-object provider payloads", () => {
    expect(sanitizeToolArgs("workspace-foreign", ["clientId"]).args).toEqual({});
    expect(sanitizeToolArgs(["workspace-foreign"], ["clientId"]).args).toEqual({});
  });
});
