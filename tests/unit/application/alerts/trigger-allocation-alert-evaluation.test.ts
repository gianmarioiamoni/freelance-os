// tests/unit/application/alerts/trigger-allocation-alert-evaluation.test.ts
import { describe, expect, it, vi } from "vitest";

import { triggerAllocationAlertEvaluation } from "@/application/alerts/trigger-allocation-alert-evaluation";
import type { WorkspaceContext } from "@/application/workspace/workspace-context";
import type { PersistenceRepositories, RunInTransaction } from "@/domain/repositories";

const context: WorkspaceContext = {
  workspaceId: "ws-1",
  userId: "user-1",
  role: "OWNER",
  timezone: "UTC",
};

describe("triggerAllocationAlertEvaluation", () => {
  it("does not throw when evaluation fails after a committed write", async () => {
    const runInTransaction = vi.fn(async () => {
      throw new Error("alert store unavailable");
    }) as unknown as RunInTransaction;
    const logged = vi.spyOn(console, "error").mockImplementation(() => undefined);

    await expect(
      triggerAllocationAlertEvaluation(context, "contract-1", runInTransaction),
    ).resolves.toBeUndefined();
    expect(logged).toHaveBeenCalled();
    logged.mockRestore();
  });

  it("evaluates the affected contract when repositories are available", async () => {
    const evaluate = vi.fn();
    const runInTransaction = (async (work) =>
      work({
        members: {
          getMember: async () => {
            evaluate();
            throw new Error("stop after membership");
          },
        },
        analytics: {},
      } as unknown as PersistenceRepositories)) as RunInTransaction;
    const logged = vi.spyOn(console, "error").mockImplementation(() => undefined);

    await triggerAllocationAlertEvaluation(context, "contract-1", runInTransaction);
    expect(evaluate).toHaveBeenCalled();
    logged.mockRestore();
  });
});
