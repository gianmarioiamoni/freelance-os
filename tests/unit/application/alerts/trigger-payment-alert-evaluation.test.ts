// tests/unit/application/alerts/trigger-payment-alert-evaluation.test.ts
import { describe, expect, it, vi } from "vitest";

import { triggerPaymentAlertEvaluation } from "@/application/alerts/trigger-payment-alert-evaluation";
import type { WorkspaceContext } from "@/application/workspace/workspace-context";
import type { PersistenceRepositories, RunInTransaction } from "@/domain/repositories";

const context: WorkspaceContext = {
  workspaceId: "ws-1",
  userId: "user-1",
  role: "OWNER",
  timezone: "UTC",
};

describe("triggerPaymentAlertEvaluation", () => {
  it("does not throw when evaluation fails after a committed write", async () => {
    const error = new Error("alert store unavailable");
    const runInTransaction = vi.fn(async () => {
      throw error;
    }) as unknown as RunInTransaction;
    const logged = vi.spyOn(console, "error").mockImplementation(() => undefined);

    await expect(
      triggerPaymentAlertEvaluation(context, "invoice-1", runInTransaction),
    ).resolves.toBeUndefined();
    expect(logged).toHaveBeenCalled();
    logged.mockRestore();
  });

  it("evaluates the affected invoice when repositories are available", async () => {
    const evaluate = vi.fn();
    const runInTransaction = (async (work) =>
      work({
        members: {
          getMember: async () => {
            evaluate();
            throw new Error("stop after membership");
          },
        },
      } as unknown as PersistenceRepositories)) as RunInTransaction;
    const logged = vi.spyOn(console, "error").mockImplementation(() => undefined);

    await triggerPaymentAlertEvaluation(context, "invoice-1", runInTransaction);
    expect(evaluate).toHaveBeenCalled();
    logged.mockRestore();
  });
});
