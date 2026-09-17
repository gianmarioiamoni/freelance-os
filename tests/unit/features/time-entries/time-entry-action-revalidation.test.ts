// tests/unit/features/time-entries/time-entry-action-revalidation.test.ts
/**
 * P-INT-02 / GAP-INT-001
 * Verify that create/update/delete TimeEntry actions call revalidatePath
 * for /, /reports, and /alerts after persistence and alert evaluation.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Module mocks – must be declared before any imports that use them.
// ---------------------------------------------------------------------------

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

vi.mock("@/features/time-entries/authenticated-time-entry-context", () => ({
  getAuthenticatedTimeEntryContext: vi.fn(),
}));

vi.mock("@/application/time-entries/create-time-entry", () => ({
  createTimeEntry: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/application/time-entries/update-time-entry", () => ({
  updateTimeEntry: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/application/time-entries/delete-time-entry", () => ({
  deleteTimeEntry: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/features/time-entries/trigger-alert-evaluation", () => ({
  triggerAlertEvaluation: vi.fn().mockResolvedValue(undefined),
}));

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAuthenticatedTimeEntryContext } from "@/features/time-entries/authenticated-time-entry-context";
import { createTimeEntryAction } from "@/features/time-entries/create-time-entry-action";
import { updateTimeEntryAction } from "@/features/time-entries/update-time-entry-action";
import { deleteTimeEntryAction } from "@/features/time-entries/delete-time-entry-action";
import type { WorkspaceMemberRole } from "@/domain/persistence-types";
import type { TimeEntryFormValues } from "@/features/time-entries/time-entry-form-state";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const EXPECTED_PATHS = ["/", "/reports", "/alerts"] as const;

function makeContext() {
  return {
    context: { workspaceId: "ws-1", userId: "user-1", role: "OWNER" as WorkspaceMemberRole, timezone: "UTC" },
    clients: {} as never,
    contracts: {} as never,
    timeEntries: {} as never,
    alerts: {} as never,
    notifications: {} as never,
    members: {} as never,
    settings: {} as never,
    analytics: {} as never,
  };
}

function makeFormData(overrides: Record<string, string> = {}): FormData {
  const fd = new FormData();
  fd.set("clientId", overrides.clientId ?? "client-1");
  fd.set("contractId", overrides.contractId ?? "contract-1");
  fd.set("workDate", overrides.workDate ?? "2026-09-18");
  fd.set("durationHours", overrides.durationHours ?? "1");
  fd.set("durationMinutes", overrides.durationMinutes ?? "30");
  fd.set("description", overrides.description ?? "Work");
  fd.set("billable", overrides.billable ?? "true");
  return fd;
}

const PREVIOUS_STATE: { error: string; values: TimeEntryFormValues } = {
  error: "",
  values: {
    clientId: "client-1",
    contractId: "contract-1",
    workDate: "2026-09-18",
    durationHours: "1",
    durationMinutes: "30",
    description: "Work",
    billable: true,
  },
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("TimeEntry action revalidation (GAP-INT-001)", () => {
  beforeEach(() => {
    vi.mocked(getAuthenticatedTimeEntryContext).mockResolvedValue(makeContext());
    vi.mocked(redirect).mockImplementation(() => { throw new Error("NEXT_REDIRECT"); });
    vi.mocked(revalidatePath).mockClear();
  });

  describe("createTimeEntryAction", () => {
    it("calls revalidatePath for /, /reports, /alerts on success", async () => {
      await expect(
        createTimeEntryAction(PREVIOUS_STATE, makeFormData()),
      ).rejects.toThrow("NEXT_REDIRECT");

      for (const path of EXPECTED_PATHS) {
        expect(revalidatePath).toHaveBeenCalledWith(path);
      }
    });

    it("calls revalidatePath before redirect", async () => {
      const callOrder: string[] = [];
      vi.mocked(revalidatePath).mockImplementation((p) => { callOrder.push(`revalidate:${String(p)}`); });
      vi.mocked(redirect).mockImplementation(() => { callOrder.push("redirect"); throw new Error("NEXT_REDIRECT"); });

      await expect(
        createTimeEntryAction(PREVIOUS_STATE, makeFormData()),
      ).rejects.toThrow("NEXT_REDIRECT");

      const revalidateIdx = callOrder.findIndex((e) => e.startsWith("revalidate:"));
      const redirectIdx = callOrder.indexOf("redirect");
      expect(revalidateIdx).toBeLessThan(redirectIdx);
    });
  });

  describe("updateTimeEntryAction", () => {
    it("calls revalidatePath for /, /reports, /alerts on success", async () => {
      await expect(
        updateTimeEntryAction("entry-1", PREVIOUS_STATE, makeFormData()),
      ).rejects.toThrow("NEXT_REDIRECT");

      for (const path of EXPECTED_PATHS) {
        expect(revalidatePath).toHaveBeenCalledWith(path);
      }
    });
  });

  describe("deleteTimeEntryAction", () => {
    it("calls revalidatePath for /, /reports, /alerts on success", async () => {
      await expect(
        deleteTimeEntryAction("entry-1", "2026-09-18"),
      ).rejects.toThrow("NEXT_REDIRECT");

      for (const path of EXPECTED_PATHS) {
        expect(revalidatePath).toHaveBeenCalledWith(path);
      }
    });
  });
});
