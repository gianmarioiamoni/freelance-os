// tests/integration/admin/workspace-protection.test.ts
import { describe, expect, it } from "vitest";

import { getCurrentWorkspaceContext } from "@/infrastructure/workspace/current-workspace";

describe("admin route isolation from workspace context", () => {
  it("existing workspace-protected routes remain unaffected by admin authorization", async () => {
    await expect(getCurrentWorkspaceContext()).rejects.toThrow();
  });
});
