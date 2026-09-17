// tests/unit/features/time-entries/trigger-alert-evaluation.test.ts
import { describe, expect, it, vi } from "vitest";

import { triggerAlertEvaluation } from "@/features/time-entries/trigger-alert-evaluation";
import type { WorkspaceContext } from "@/application/workspace/workspace-context";
import type {
  AlertRepository,
  AnalyticsRepository,
  NotificationRepository,
  WorkspaceMemberRepository,
  WorkspaceSettingsRepository,
} from "@/domain/repositories";
import type { WorkspaceMemberRecord } from "@/domain/persistence-types";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const context: WorkspaceContext = {
  workspaceId: "ws-1",
  userId: "user-1",
  role: "OWNER",
  timezone: "Europe/Rome",
};

function makeMember(): WorkspaceMemberRecord {
  return {
    workspaceId: "ws-1",
    userId: "user-1",
    role: "OWNER",
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
  };
}

function makeRepositories(overrides: Partial<{
  alerts: Partial<AlertRepository>;
  notifications: Partial<NotificationRepository>;
  members: Partial<WorkspaceMemberRepository>;
  settings: Partial<WorkspaceSettingsRepository>;
  analytics: Partial<AnalyticsRepository>;
}> = {}) {
  const alerts: AlertRepository = {
    createAlert: vi.fn().mockResolvedValue({ id: "alert-1" }),
    findAlertByDeduplicationKey: vi.fn().mockResolvedValue(null),
    resolveAlert: vi.fn().mockResolvedValue({ id: "alert-1" }),
    getAlert: vi.fn().mockResolvedValue(null),
    ...overrides.alerts,
  };

  const notifications: NotificationRepository = {
    createNotification: vi.fn().mockResolvedValue({ id: "notif-1" }),
    getNotification: vi.fn().mockResolvedValue(null),
    listNotificationsForUser: vi.fn().mockResolvedValue([]),
    markNotificationRead: vi.fn().mockResolvedValue({ id: "notif-1" }),
    ...overrides.notifications,
  };

  const members: WorkspaceMemberRepository = {
    addMember: vi.fn().mockResolvedValue(makeMember()),
    getMember: vi.fn().mockResolvedValue(makeMember()),
    listMembers: vi.fn().mockResolvedValue([makeMember()]),
    listMembershipsByUserId: vi.fn().mockResolvedValue([]),
    ...overrides.members,
  };

  const settings: WorkspaceSettingsRepository = {
    getSettings: vi.fn().mockResolvedValue(null),
    putSettings: vi.fn().mockResolvedValue(null),
    ...overrides.settings,
  };

  const analytics: AnalyticsRepository = {
    getDailyAnalytics: vi.fn().mockResolvedValue([]),
    getMonthlyAnalytics: vi.fn().mockResolvedValue({ totalMinutes: 0 }),
    getContractUtilizations: vi.fn().mockResolvedValue([]),
    getClientAllocations: vi.fn().mockResolvedValue([]),
    ...overrides.analytics,
  };

  return { alerts, notifications, members, settings, analytics };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("triggerAlertEvaluation", () => {
  it("invokes AlertService.evaluateContractAlerts with the correct workspace context", async () => {
    const repos = makeRepositories();

    await triggerAlertEvaluation(context, repos);

    expect(repos.members.getMember).toHaveBeenCalledWith(context.workspaceId, context.userId);
    expect(repos.analytics.getContractUtilizations).toHaveBeenCalledWith(
      context.workspaceId,
      expect.any(Object),
    );
  });

  it("does not throw when AlertService.evaluateContractAlerts succeeds with no contracts", async () => {
    const repos = makeRepositories();

    await expect(triggerAlertEvaluation(context, repos)).resolves.toBeUndefined();
  });

  it("does not throw when alert evaluation fails — best-effort semantics", async () => {
    const repos = makeRepositories({
      members: {
        getMember: vi.fn().mockRejectedValue(new Error("DB connection failure")),
        listMembers: vi.fn().mockResolvedValue([]),
      },
    });

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(triggerAlertEvaluation(context, repos)).resolves.toBeUndefined();

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("alert evaluation failed"),
      expect.any(Error),
    );

    consoleSpy.mockRestore();
  });

  it("logs the workspaceId when alert evaluation fails", async () => {
    const repos = makeRepositories({
      analytics: {
        getContractUtilizations: vi.fn().mockRejectedValue(new Error("Analytics failure")),
        getDailyAnalytics: vi.fn().mockResolvedValue([]),
        getMonthlyAnalytics: vi.fn().mockResolvedValue({ totalMinutes: 0 }),
        getClientAllocations: vi.fn().mockResolvedValue([]),
      },
    });

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await triggerAlertEvaluation(context, repos);

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("workspaceId=ws-1"),
      expect.any(Error),
    );

    consoleSpy.mockRestore();
  });
});
