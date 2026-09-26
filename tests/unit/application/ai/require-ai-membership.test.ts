// tests/unit/application/ai/require-ai-membership.test.ts
import { describe, expect, it } from "vitest";

import { requireAiMembership } from "@/application/ai/require-ai-membership";
import { UnauthorizedWorkspaceAccessError } from "@/domain/workspace-errors";

import { membersLookingUp, owningMembers, workspaceContext } from "./ai-test-helpers";

describe("requireAiMembership", () => {
  it("allows a member of the trusted workspace context", async () => {
    const context = workspaceContext();
    await expect(requireAiMembership(context, owningMembers(context))).resolves.toBeUndefined();
  });

  it("denies a caller who is not a member of the context workspace", async () => {
    await expect(
      requireAiMembership(workspaceContext(), membersLookingUp(() => null)),
    ).rejects.toBeInstanceOf(UnauthorizedWorkspaceAccessError);
  });
});
