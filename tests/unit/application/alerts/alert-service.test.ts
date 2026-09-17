// tests/unit/application/alerts/alert-service.test.ts
import { describe, expect, it, vi } from "vitest";

import { AlertService } from "@/application/alerts/alert-service";
import { buildContractAlertDedupKey } from "@/application/alerts/alert-dedup-key";
import { UnauthorizedWorkspaceAccessError } from "@/domain/workspace-errors";
import { UniqueConstraintViolationError } from "@/domain/persistence-errors";
import type { AlertRepository, NotificationRepository, WorkspaceMemberRepository, WorkspaceSettingsRepository } from "@/domain/repositories";
import type { WorkspaceContext } from "@/application/workspace/workspace-context";
import type { AlertRecord, NotificationRecord, WorkspaceMemberRecord, WorkspaceSettingsRecord } from "@/domain/persistence-types";
import type { ContractUtilization } from "@/domain/analytics-types";
import { AnalyticsService } from "@/application/analytics/analytics-service";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const context: WorkspaceContext = {
  workspaceId: "ws-1",
  userId: "user-1",
  role: "OWNER",
  timezone: "UTC",
};

const period = {
  startDate: new Date("2026-09-01T00:00:00.000Z"),
  endDate: new Date("2026-09-17T00:00:00.000Z"),
};

const contractId = "contract-1";
const clientName = "ACME Corp";

function makeUtilization(override: Partial<ContractUtilization> = {}): ContractUtilization {
  return {
    contractId,
    clientName,
    validFrom: new Date("2026-01-01T00:00:00.000Z"),
    validTo: null,
    isOngoing: true,
    consumedMinutes: 4800,
    contractedMinutes: 6000,
    utilizationPercentage: 80,
    isOutOfValidity: false,
    ...override,
  };
}

function makeAlert(override: Partial<AlertRecord> = {}): AlertRecord {
  return {
    id: "alert-1",
    workspaceId: context.workspaceId,
    type: "CONTRACT_WARNING",
    severity: "WARNING",
    clientId: null,
    contractId,
    periodStart: period.startDate,
    periodEnd: period.endDate,
    deduplicationKey: buildContractAlertDedupKey("CONTRACT_WARNING", context.workspaceId, contractId, period.startDate),
    createdAt: new Date("2026-09-10T08:00:00.000Z"),
    resolvedAt: null,
    ...override,
  };
}

function makeNotification(override: Partial<NotificationRecord> = {}): NotificationRecord {
  return {
    id: "notif-1",
    workspaceId: context.workspaceId,
    userId: context.userId,
    alertId: "alert-1",
    type: "ALERT",
    title: "Contract approaching limit",
    body: "ACME Corp contract is at 80% of contracted capacity.",
    readAt: null,
    createdAt: new Date("2026-09-10T08:00:00.000Z"),
    ...override,
  };
}

function makeMembership(): WorkspaceMemberRecord {
  return {
    workspaceId: context.workspaceId,
    userId: context.userId,
    role: "OWNER",
    createdAt: new Date(),
  };
}

function makeSettings(override: Partial<WorkspaceSettingsRecord> = {}): WorkspaceSettingsRecord {
  return {
    workspaceId: context.workspaceId,
    timezone: "UTC",
    currency: "EUR",
    contractWarningPercent: 80,
    monthlyCapacityWarningPercent: 80,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...override,
  };
}

// ---------------------------------------------------------------------------
// Mock builders
// ---------------------------------------------------------------------------

function makeMockAlerts(overrides: Partial<AlertRepository> = {}): AlertRepository {
  return {
    createAlert: vi.fn().mockResolvedValue(makeAlert()),
    getAlert: vi.fn().mockResolvedValue(null),
    findAlertByDeduplicationKey: vi.fn().mockResolvedValue(null),
    resolveAlert: vi.fn().mockResolvedValue(makeAlert({ resolvedAt: new Date() })),
    ...overrides,
  };
}

function makeMockNotifications(overrides: Partial<NotificationRepository> = {}): NotificationRepository {
  return {
    createNotification: vi.fn().mockResolvedValue(makeNotification()),
    getNotification: vi.fn().mockResolvedValue(null),
    listNotificationsForUser: vi.fn().mockResolvedValue([]),
    markNotificationRead: vi.fn().mockResolvedValue(makeNotification({ readAt: new Date() })),
    ...overrides,
  };
}

function makeMockMembers(isMember = true): WorkspaceMemberRepository {
  return {
    addMember: vi.fn(),
    getMember: vi.fn().mockResolvedValue(isMember ? makeMembership() : null),
    listMembers: vi.fn().mockResolvedValue([makeMembership()]),
    listMembershipsByUserId: vi.fn().mockResolvedValue([]),
  };
}

function makeMockSettings(settings: WorkspaceSettingsRecord | null = makeSettings()): WorkspaceSettingsRepository {
  return {
    getSettings: vi.fn().mockResolvedValue(settings),
    putSettings: vi.fn(),
  };
}

function makeMockAnalyticsService(utilizations: ContractUtilization[]): AnalyticsService {
  const svc = new AnalyticsService(
    {
      getMonthlyAnalytics: vi.fn(),
      getDailyAnalytics: vi.fn(),
      getClientAllocations: vi.fn(),
      getContractUtilizations: vi.fn().mockResolvedValue(utilizations),
    },
    makeMockMembers(),
  );
  // spy on the method so we can verify delegation
  vi.spyOn(svc, "getContractUtilizations").mockResolvedValue(utilizations);
  return svc;
}

function makeService(opts: {
  utilizations?: ContractUtilization[];
  alerts?: Partial<AlertRepository>;
  notifications?: Partial<NotificationRepository>;
  isMember?: boolean;
  settings?: WorkspaceSettingsRecord | null;
}): { service: AlertService; mocks: { alerts: AlertRepository; notifications: NotificationRepository; analytics: AnalyticsService; settings: WorkspaceSettingsRepository } } {
  const utilizations = opts.utilizations ?? [makeUtilization()];
  const alertRepo = makeMockAlerts(opts.alerts ?? {});
  const notificationRepo = makeMockNotifications(opts.notifications ?? {});
  const memberRepo = makeMockMembers(opts.isMember ?? true);
  const settingsRepo = makeMockSettings(opts.settings ?? makeSettings());
  const analyticsService = makeMockAnalyticsService(utilizations);

  return {
    service: new AlertService(alertRepo, notificationRepo, memberRepo, settingsRepo, analyticsService),
    mocks: { alerts: alertRepo, notifications: notificationRepo, analytics: analyticsService, settings: settingsRepo },
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("AlertService.evaluateContractAlerts", () => {
  describe("workspace isolation", () => {
    it("rejects non-member with UnauthorizedWorkspaceAccessError", async () => {
      const { service } = makeService({ isMember: false });
      await expect(service.evaluateContractAlerts(context)).rejects.toThrow(
        UnauthorizedWorkspaceAccessError,
      );
    });

    it("allows workspace member to evaluate", async () => {
      const { service } = makeService({ utilizations: [] });
      await expect(service.evaluateContractAlerts(context)).resolves.toBeDefined();
    });
  });

  describe("null capacity — no alert", () => {
    it("fires no alert when contractedMinutes is null (unlimited contract)", async () => {
      const { service, mocks } = makeService({
        utilizations: [makeUtilization({ contractedMinutes: null, utilizationPercentage: null })],
      });
      const result = await service.evaluateContractAlerts(context);
      expect(mocks.alerts.createAlert).not.toHaveBeenCalled();
      expect(mocks.notifications.createNotification).not.toHaveBeenCalled();
      expect(result.alertsCreated).toBe(0);
    });
  });

  describe("CONTRACT_WARNING (AR-001)", () => {
    it("fires no warning when below threshold (79.99%)", async () => {
      const { service, mocks } = makeService({
        utilizations: [makeUtilization({ utilizationPercentage: 79.99, consumedMinutes: 4799 })],
      });
      const result = await service.evaluateContractAlerts(context);
      expect(
        result.contractResults[0].warning.action,
      ).toBe("none");
      expect(mocks.alerts.createAlert).not.toHaveBeenCalled();
    });

    it("fires warning at exactly 80% threshold", async () => {
      const { service, mocks } = makeService({
        utilizations: [makeUtilization({ utilizationPercentage: 80 })],
      });
      const result = await service.evaluateContractAlerts(context);
      expect(result.contractResults[0].warning.action).toBe("created");
      expect(mocks.alerts.createAlert).toHaveBeenCalledWith(
        context.workspaceId,
        expect.objectContaining({ type: "CONTRACT_WARNING", severity: "WARNING" }),
      );
    });

    it("fires warning above 80% threshold", async () => {
      const { service } = makeService({
        utilizations: [makeUtilization({ utilizationPercentage: 90 })],
      });
      const result = await service.evaluateContractAlerts(context);
      expect(result.contractResults[0].warning.action).toBe("created");
    });

    it("uses WorkspaceSettings.contractWarningPercent (not hardcoded 80)", async () => {
      const { service, mocks } = makeService({
        utilizations: [makeUtilization({ utilizationPercentage: 75 })],
        settings: makeSettings({ contractWarningPercent: 70 }),
      });
      const result = await service.evaluateContractAlerts(context);
      // 75 >= 70 → should fire
      expect(result.contractResults[0].warning.action).toBe("created");
      expect(mocks.settings.getSettings).toHaveBeenCalledWith(context.workspaceId);
    });

    it("falls back to 80% default when settings are null", async () => {
      const { service } = makeService({
        utilizations: [makeUtilization({ utilizationPercentage: 79 })],
        settings: null,
      });
      const result = await service.evaluateContractAlerts(context);
      // 79 < 80 default → no warning
      expect(result.contractResults[0].warning.action).toBe("none");
    });
  });

  describe("CONTRACT_EXCEEDED (AR-002)", () => {
    it("fires no exceeded alert below 100%", async () => {
      const { service } = makeService({
        utilizations: [makeUtilization({ utilizationPercentage: 99.9 })],
      });
      const result = await service.evaluateContractAlerts(context);
      expect(result.contractResults[0].exceeded.action).toBe("none");
    });

    it("fires exceeded alert at exactly 100%", async () => {
      const { service, mocks } = makeService({
        utilizations: [makeUtilization({ utilizationPercentage: 100, consumedMinutes: 6000 })],
      });
      const result = await service.evaluateContractAlerts(context);
      expect(result.contractResults[0].exceeded.action).toBe("created");
      expect(mocks.alerts.createAlert).toHaveBeenCalledWith(
        context.workspaceId,
        expect.objectContaining({ type: "CONTRACT_EXCEEDED", severity: "ERROR" }),
      );
    });

    it("fires exceeded alert above 100%", async () => {
      const { service } = makeService({
        utilizations: [makeUtilization({ utilizationPercentage: 120 })],
      });
      const result = await service.evaluateContractAlerts(context);
      expect(result.contractResults[0].exceeded.action).toBe("created");
    });
  });

  describe("both alerts fire simultaneously when utilization >= 100% (OQ-106-001 default)", () => {
    it("creates both WARNING and EXCEEDED alerts at 100%", async () => {
      const { service, mocks } = makeService({
        utilizations: [makeUtilization({ utilizationPercentage: 100 })],
      });
      const result = await service.evaluateContractAlerts(context);
      expect(result.contractResults[0].warning.action).toBe("created");
      expect(result.contractResults[0].exceeded.action).toBe("created");
      expect(result.alertsCreated).toBe(2);
      expect(mocks.alerts.createAlert).toHaveBeenCalledTimes(2);
    });
  });

  describe("alert creation and notification", () => {
    it("creates a notification when a new alert is created", async () => {
      const { service, mocks } = makeService({
        utilizations: [makeUtilization({ utilizationPercentage: 80 })],
      });
      await service.evaluateContractAlerts(context);
      expect(mocks.notifications.createNotification).toHaveBeenCalledWith(
        context.workspaceId,
        expect.objectContaining({
          userId: context.userId,
          type: "ALERT",
          alertId: expect.any(String),
        }),
      );
    });

    it("sets correct deduplication key format", async () => {
      const { service, mocks } = makeService({
        utilizations: [makeUtilization({ utilizationPercentage: 80 })],
      });
      await service.evaluateContractAlerts(context);
      expect(mocks.alerts.createAlert).toHaveBeenCalledWith(
        context.workspaceId,
        expect.objectContaining({
          deduplicationKey: expect.stringMatching(/^cw:ws-1:contract-1:2026-09-01/),
        }),
      );
    });

    it("associates the correct alert type and severity", async () => {
      const { service, mocks } = makeService({
        utilizations: [makeUtilization({ utilizationPercentage: 80 })],
      });
      await service.evaluateContractAlerts(context);
      // WARNING alert
      expect(mocks.alerts.createAlert).toHaveBeenCalledWith(
        context.workspaceId,
        expect.objectContaining({ type: "CONTRACT_WARNING", severity: "WARNING" }),
      );
    });
  });

  describe("deduplication", () => {
    it("does not create a duplicate alert when one is already active", async () => {
      const activeAlert = makeAlert({ resolvedAt: null });
      const { service, mocks } = makeService({
        utilizations: [makeUtilization({ utilizationPercentage: 80 })],
        alerts: { findAlertByDeduplicationKey: vi.fn().mockResolvedValue(activeAlert) },
      });
      const result = await service.evaluateContractAlerts(context);
      expect(result.contractResults[0].warning.action).toBe("deduplicated");
      expect(mocks.alerts.createAlert).not.toHaveBeenCalled();
      expect(mocks.notifications.createNotification).not.toHaveBeenCalled();
    });

    it("does not create notification on repeated evaluation while condition remains true", async () => {
      const activeAlert = makeAlert({ resolvedAt: null });
      const { service, mocks } = makeService({
        utilizations: [makeUtilization({ utilizationPercentage: 85 })],
        alerts: { findAlertByDeduplicationKey: vi.fn().mockResolvedValue(activeAlert) },
      });
      await service.evaluateContractAlerts(context);
      await service.evaluateContractAlerts(context);
      expect(mocks.alerts.createAlert).not.toHaveBeenCalled();
    });

    it("handles concurrent race condition by catching UniqueConstraintViolationError", async () => {
      const { service, mocks } = makeService({
        utilizations: [makeUtilization({ utilizationPercentage: 80 })],
        alerts: {
          findAlertByDeduplicationKey: vi.fn().mockResolvedValue(null),
          createAlert: vi.fn().mockRejectedValue(new UniqueConstraintViolationError()),
        },
      });
      const result = await service.evaluateContractAlerts(context);
      // Race condition treated as idempotent deduplicated
      expect(result.contractResults[0].warning.action).toBe("deduplicated");
      expect(mocks.notifications.createNotification).not.toHaveBeenCalled();
    });
  });

  describe("alert resolution", () => {
    it("resolves active warning alert when condition drops below threshold", async () => {
      const activeAlert = makeAlert({ resolvedAt: null });
      const { service, mocks } = makeService({
        utilizations: [makeUtilization({ utilizationPercentage: 79 })],
        alerts: {
          findAlertByDeduplicationKey: vi.fn().mockResolvedValue(activeAlert),
          resolveAlert: vi.fn().mockResolvedValue(makeAlert({ resolvedAt: new Date() })),
        },
      });
      const result = await service.evaluateContractAlerts(context);
      expect(result.contractResults[0].warning.action).toBe("resolved");
      expect(mocks.alerts.resolveAlert).toHaveBeenCalledWith(
        context.workspaceId,
        activeAlert.id,
        expect.any(Date),
      );
    });

    it("does not resolve when no active alert exists and condition is below threshold", async () => {
      const { service, mocks } = makeService({
        utilizations: [makeUtilization({ utilizationPercentage: 50 })],
        alerts: { findAlertByDeduplicationKey: vi.fn().mockResolvedValue(null) },
      });
      const result = await service.evaluateContractAlerts(context);
      expect(result.contractResults[0].warning.action).toBe("none");
      expect(mocks.alerts.resolveAlert).not.toHaveBeenCalled();
    });

    it("does not resolve an already-resolved alert", async () => {
      const resolvedAlert = makeAlert({ resolvedAt: new Date("2026-09-09T00:00:00.000Z") });
      const { service, mocks } = makeService({
        utilizations: [makeUtilization({ utilizationPercentage: 50 })],
        alerts: { findAlertByDeduplicationKey: vi.fn().mockResolvedValue(resolvedAlert) },
      });
      const result = await service.evaluateContractAlerts(context);
      expect(result.contractResults[0].warning.action).toBe("none");
      expect(mocks.alerts.resolveAlert).not.toHaveBeenCalled();
    });
  });

  describe("re-trigger after resolution", () => {
    it("creates a new alert when resolved alert exists and condition re-fires", async () => {
      const resolvedAlert = makeAlert({
        resolvedAt: new Date("2026-09-09T00:00:00.000Z"),
      });
      const { service, mocks } = makeService({
        utilizations: [makeUtilization({ utilizationPercentage: 85 })],
        alerts: {
          findAlertByDeduplicationKey: vi.fn().mockResolvedValue(resolvedAlert),
          createAlert: vi.fn().mockResolvedValue(makeAlert({ id: "alert-retrigger" })),
        },
      });
      const result = await service.evaluateContractAlerts(context);
      expect(result.contractResults[0].warning.action).toBe("created");
      expect(mocks.alerts.createAlert).toHaveBeenCalled();
      // re-trigger key must differ from base key
      const [, callInput] = (mocks.alerts.createAlert as ReturnType<typeof vi.fn>).mock.calls[0] as [string, { deduplicationKey: string }];
      const baseKey = buildContractAlertDedupKey("CONTRACT_WARNING", context.workspaceId, contractId, period.startDate);
      expect(callInput.deduplicationKey).not.toBe(baseKey);
    });

    it("creates a notification for the re-triggered alert", async () => {
      const resolvedAlert = makeAlert({
        resolvedAt: new Date("2026-09-09T00:00:00.000Z"),
      });
      const { service, mocks } = makeService({
        utilizations: [makeUtilization({ utilizationPercentage: 85 })],
        alerts: {
          findAlertByDeduplicationKey: vi.fn().mockResolvedValue(resolvedAlert),
        },
      });
      await service.evaluateContractAlerts(context);
      expect(mocks.notifications.createNotification).toHaveBeenCalled();
    });
  });

  describe("result counters", () => {
    it("increments alertsCreated and notificationsCreated on new alert", async () => {
      const { service } = makeService({
        utilizations: [makeUtilization({ utilizationPercentage: 80 })],
      });
      const result = await service.evaluateContractAlerts(context);
      expect(result.alertsCreated).toBeGreaterThanOrEqual(1);
      expect(result.notificationsCreated).toBeGreaterThanOrEqual(1);
    });

    it("increments alertsResolved on resolution", async () => {
      const activeAlert = makeAlert({ resolvedAt: null });
      const { service } = makeService({
        utilizations: [makeUtilization({ utilizationPercentage: 50 })],
        alerts: { findAlertByDeduplicationKey: vi.fn().mockResolvedValue(activeAlert) },
      });
      const result = await service.evaluateContractAlerts(context);
      expect(result.alertsResolved).toBeGreaterThanOrEqual(1);
    });

    it("returns zero counters when no conditions fire", async () => {
      const { service } = makeService({
        utilizations: [makeUtilization({ utilizationPercentage: 50 })],
      });
      const result = await service.evaluateContractAlerts(context);
      expect(result.alertsCreated).toBe(0);
      expect(result.alertsResolved).toBe(0);
      expect(result.notificationsCreated).toBe(0);
    });
  });

  describe("delegation to AnalyticsService", () => {
    it("delegates contract utilization calculation to AnalyticsService (no duplication)", async () => {
      const { service, mocks } = makeService({ utilizations: [] });
      await service.evaluateContractAlerts(context);
      expect(mocks.analytics.getContractUtilizations).toHaveBeenCalledWith(
        context,
        expect.objectContaining({ startDate: expect.any(Date), endDate: expect.any(Date) }),
      );
    });
  });
});

describe("AlertService.getNotificationsForUser", () => {
  it("rejects non-member", async () => {
    const { service } = makeService({ isMember: false });
    await expect(service.getNotificationsForUser(context)).rejects.toThrow(
      UnauthorizedWorkspaceAccessError,
    );
  });

  it("returns notifications for user", async () => {
    const notifs = [makeNotification(), makeNotification({ id: "notif-2" })];
    const { service } = makeService({
      notifications: { listNotificationsForUser: vi.fn().mockResolvedValue(notifs) },
    });
    const result = await service.getNotificationsForUser(context);
    expect(result).toHaveLength(2);
  });
});

describe("AlertService.getUnreadCount", () => {
  it("counts only unread notifications", async () => {
    const notifs = [
      makeNotification({ readAt: null }),
      makeNotification({ id: "notif-2", readAt: new Date() }),
      makeNotification({ id: "notif-3", readAt: null }),
    ];
    const { service } = makeService({
      notifications: { listNotificationsForUser: vi.fn().mockResolvedValue(notifs) },
    });
    const count = await service.getUnreadCount(context);
    expect(count).toBe(2);
  });
});

describe("AlertService.markNotificationRead", () => {
  it("rejects non-member", async () => {
    const { service } = makeService({ isMember: false });
    await expect(service.markNotificationRead(context, "notif-1")).rejects.toThrow(
      UnauthorizedWorkspaceAccessError,
    );
  });

  it("delegates to repository and returns updated notification", async () => {
    const readAt = new Date();
    const updatedNotif = makeNotification({ readAt });
    const { service, mocks } = makeService({
      notifications: { markNotificationRead: vi.fn().mockResolvedValue(updatedNotif) },
    });
    const result = await service.markNotificationRead(context, "notif-1");
    expect(result.readAt).toEqual(readAt);
    expect(mocks.notifications.markNotificationRead).toHaveBeenCalledWith(
      context.workspaceId,
      "notif-1",
      expect.any(Date),
    );
  });

  it("reading a notification does NOT resolve the alert (independence)", async () => {
    const { service, mocks } = makeService({
      notifications: { markNotificationRead: vi.fn().mockResolvedValue(makeNotification({ readAt: new Date() })) },
    });
    await service.markNotificationRead(context, "notif-1");
    expect(mocks.alerts.resolveAlert).not.toHaveBeenCalled();
  });
});
