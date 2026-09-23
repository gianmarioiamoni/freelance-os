// tests/unit/application/alerts/evaluate-allocation-alerts.test.ts
import { describe, expect, it, vi } from "vitest";

import { evaluateContractAllocationAlerts } from "@/application/alerts/evaluate-allocation-alerts";
import type { AnalyticsService } from "@/application/analytics/analytics-service";
import { UniqueConstraintViolationError } from "@/domain/persistence-errors";
import { UnauthorizedWorkspaceAccessError } from "@/domain/workspace-errors";
import type { ContractAllocation } from "@/domain/analytics-types";
import type { AlertRecord, NotificationRecord } from "@/domain/persistence-types";
import type {
  AlertRepository,
  NotificationRepository,
  WorkspaceMemberRepository,
} from "@/domain/repositories";
import type { WorkspaceContext } from "@/application/workspace/workspace-context";

const context: WorkspaceContext = {
  workspaceId: "ws-1",
  userId: "user-1",
  role: "OWNER",
  timezone: "UTC",
};

function view(overrides: Partial<ContractAllocation> = {}): ContractAllocation {
  return {
    contractId: "contract-1",
    allocatedMinutes: 1000,
    consumedMinutes: 0,
    remainingMinutes: 1000,
    allocationStatus: "NORMAL",
    ...overrides,
  };
}

function alertRecord(overrides: Partial<AlertRecord> = {}): AlertRecord {
  return {
    id: "alert-1",
    workspaceId: context.workspaceId,
    type: "ALLOCATION_WARNING",
    severity: "WARNING",
    clientId: null,
    contractId: "contract-1",
    invoiceId: null,
    periodStart: null,
    periodEnd: null,
    deduplicationKey: "aw:ws-1:contract-1",
    createdAt: new Date("2026-09-23T08:00:00.000Z"),
    resolvedAt: null,
    ...overrides,
  };
}

function notificationRecord(): NotificationRecord {
  return {
    id: "notif-1",
    workspaceId: context.workspaceId,
    userId: context.userId,
    alertId: "alert-1",
    type: "ALERT",
    title: "Contract allocation warning",
    body: "Tracked time has reached 80% of the contract allocation.",
    readAt: null,
    createdAt: new Date("2026-09-23T08:00:00.000Z"),
  };
}

function repos(options: {
  member?: boolean;
  alerts?: Partial<AlertRepository>;
} = {}) {
  const created: AlertRecord[] = [];
  const alerts: AlertRepository = {
    createAlert: vi.fn().mockImplementation(async (_workspaceId, input) => {
      const row = alertRecord({
        id: `alert-${created.length + 1}`,
        type: input.type,
        severity: input.severity,
        contractId: input.contractId ?? null,
        invoiceId: input.invoiceId ?? null,
        periodStart: input.periodStart ?? null,
        periodEnd: input.periodEnd ?? null,
        deduplicationKey: input.deduplicationKey,
      });
      created.push(row);
      return row;
    }),
    getAlert: vi.fn().mockResolvedValue(null),
    findAlertByDeduplicationKey: vi.fn().mockResolvedValue(null),
    findActiveAlertByContractAndType: vi.fn().mockResolvedValue(null),
    findActiveAlertByInvoiceAndType: vi.fn().mockResolvedValue(null),
    resolveAlert: vi.fn().mockImplementation(async (_workspaceId, alertId) =>
      alertRecord({ id: alertId, resolvedAt: new Date() }),
    ),
    ...options.alerts,
  };

  const notifications: NotificationRepository = {
    createNotification: vi.fn().mockResolvedValue(notificationRecord()),
    getNotification: vi.fn(),
    listNotificationsForUser: vi.fn(),
    markNotificationRead: vi.fn(),
    countUnreadNotificationsForUser: vi.fn(),
  };

  const members: WorkspaceMemberRepository = {
    getMember: vi.fn().mockResolvedValue(
      options.member === false
        ? null
        : {
            workspaceId: context.workspaceId,
            userId: context.userId,
            role: "OWNER",
            createdAt: new Date(),
          },
    ),
    addMember: vi.fn(),
    listMembers: vi.fn(),
    listMembershipsByUserId: vi.fn(),
  };

  return { alerts, notifications, members, created };
}

function analytics(allocation: ContractAllocation): AnalyticsService {
  return {
    getContractAllocation: vi.fn().mockResolvedValue(allocation),
  } as unknown as AnalyticsService;
}

async function evaluate(allocation: ContractAllocation, alertRepos = repos()) {
  return {
    result: await evaluateContractAllocationAlerts(
      context,
      "contract-1",
      alertRepos,
      analytics(allocation),
    ),
    alertRepos,
  };
}

describe("evaluateContractAllocationAlerts predicates", () => {
  it("rejects a non-member before reading allocation", async () => {
    const getContractAllocation = vi.fn();
    await expect(
      evaluateContractAllocationAlerts(
        context,
        "contract-1",
        repos({ member: false }),
        { getContractAllocation } as unknown as AnalyticsService,
      ),
    ).rejects.toThrow(UnauthorizedWorkspaceAccessError);
    expect(getContractAllocation).not.toHaveBeenCalled();
  });

  it("creates nothing for null allocation", async () => {
    const { result, alertRepos } = await evaluate(
      view({ allocatedMinutes: null, remainingMinutes: null, allocationStatus: null }),
    );
    expect(result.alertsCreated).toBe(0);
    expect(alertRepos.alerts.createAlert).not.toHaveBeenCalled();
  });

  it("creates nothing for zero allocation with zero or positive consumption", async () => {
    const unused = await evaluate(
      view({ allocatedMinutes: 0, consumedMinutes: 0, remainingMinutes: 0, allocationStatus: null }),
    );
    expect(unused.result.alertsCreated).toBe(0);

    const used = await evaluate(
      view({ allocatedMinutes: 0, consumedMinutes: 50, remainingMinutes: 0, allocationStatus: null }),
    );
    expect(used.result.alertsCreated).toBe(0);
    expect(used.alertRepos.alerts.createAlert).not.toHaveBeenCalled();
  });

  it("creates nothing below 80%", async () => {
    const { result, alertRepos } = await evaluate(
      view({ consumedMinutes: 799, remainingMinutes: 201, allocationStatus: "NORMAL" }),
    );
    expect(result.alertsCreated).toBe(0);
    expect(alertRepos.alerts.createAlert).not.toHaveBeenCalled();
  });

  it("creates ALLOCATION_WARNING at exactly 80%, between 80 and 100, and at 100%", async () => {
    for (const consumedMinutes of [800, 900, 1000]) {
      const { result } = await evaluate(
        view({
          consumedMinutes,
          remainingMinutes: Math.max(1000 - consumedMinutes, 0),
          allocationStatus: "WARNING",
        }),
      );
      expect(result.alertsCreated).toBe(1);
      expect(result.warning.action).toBe("created");
      expect(result.exceeded.action).toBe("none");
    }
  });

  it("creates ALLOCATION_EXCEEDED above 100%", async () => {
    const { result } = await evaluate(
      view({ consumedMinutes: 1001, remainingMinutes: 0, allocationStatus: "EXCEEDED" }),
    );
    expect(result.alertsCreated).toBe(1);
    expect(result.exceeded.action).toBe("created");
    expect(result.warning.action).toBe("none");
  });
});

describe("evaluateContractAllocationAlerts transitions", () => {
  it("NORMAL -> WARNING creates ALLOCATION_WARNING", async () => {
    const { result } = await evaluate(
      view({ consumedMinutes: 800, remainingMinutes: 200, allocationStatus: "WARNING" }),
    );
    expect(result.warning.action).toBe("created");
  });

  it("WARNING -> EXCEEDED resolves WARNING and creates EXCEEDED", async () => {
    const warning = alertRecord();
    const alertRepos = repos({
      alerts: {
        findActiveAlertByContractAndType: vi.fn().mockImplementation(
          async (_workspaceId, _contractId, type) =>
            type === "ALLOCATION_WARNING" ? warning : null,
        ),
      },
    });

    const { result } = await evaluate(
      view({ consumedMinutes: 1100, remainingMinutes: 0, allocationStatus: "EXCEEDED" }),
      alertRepos,
    );

    expect(result.warning.action).toBe("resolved");
    expect(result.exceeded.action).toBe("created");
  });

  it("EXCEEDED -> WARNING resolves EXCEEDED and creates WARNING", async () => {
    const exceeded = alertRecord({
      id: "alert-ex",
      type: "ALLOCATION_EXCEEDED",
      severity: "ERROR",
      deduplicationKey: "ae:ws-1:contract-1",
    });
    const alertRepos = repos({
      alerts: {
        findActiveAlertByContractAndType: vi.fn().mockImplementation(
          async (_workspaceId, _contractId, type) =>
            type === "ALLOCATION_EXCEEDED" ? exceeded : null,
        ),
      },
    });

    const { result } = await evaluate(
      view({ consumedMinutes: 900, remainingMinutes: 100, allocationStatus: "WARNING" }),
      alertRepos,
    );

    expect(result.exceeded.action).toBe("resolved");
    expect(result.warning.action).toBe("created");
  });

  it("WARNING -> NORMAL resolves WARNING", async () => {
    const warning = alertRecord();
    const alertRepos = repos({
      alerts: {
        findActiveAlertByContractAndType: vi.fn().mockImplementation(
          async (_workspaceId, _contractId, type) =>
            type === "ALLOCATION_WARNING" ? warning : null,
        ),
      },
    });

    const { result } = await evaluate(
      view({ consumedMinutes: 100, remainingMinutes: 900, allocationStatus: "NORMAL" }),
      alertRepos,
    );

    expect(result.warning.action).toBe("resolved");
    expect(result.alertsCreated).toBe(0);
  });

  it("EXCEEDED -> NORMAL resolves EXCEEDED", async () => {
    const exceeded = alertRecord({
      type: "ALLOCATION_EXCEEDED",
      severity: "ERROR",
      deduplicationKey: "ae:ws-1:contract-1",
    });
    const alertRepos = repos({
      alerts: {
        findActiveAlertByContractAndType: vi.fn().mockImplementation(
          async (_workspaceId, _contractId, type) =>
            type === "ALLOCATION_EXCEEDED" ? exceeded : null,
        ),
      },
    });

    const { result } = await evaluate(
      view({ consumedMinutes: 100, remainingMinutes: 900, allocationStatus: "NORMAL" }),
      alertRepos,
    );

    expect(result.exceeded.action).toBe("resolved");
    expect(result.alertsCreated).toBe(0);
  });

  it("positive -> zero resolves active allocation alerts and creates nothing", async () => {
    const warning = alertRecord();
    const alertRepos = repos({
      alerts: {
        findActiveAlertByContractAndType: vi.fn().mockImplementation(
          async (_workspaceId, _contractId, type) =>
            type === "ALLOCATION_WARNING" ? warning : null,
        ),
      },
    });

    const { result } = await evaluate(
      view({ allocatedMinutes: 0, consumedMinutes: 50, remainingMinutes: 0, allocationStatus: null }),
      alertRepos,
    );

    expect(result.warning.action).toBe("resolved");
    expect(result.alertsCreated).toBe(0);
    expect(alertRepos.alerts.createAlert).not.toHaveBeenCalled();
  });

  it("positive -> null resolves active allocation alerts and creates nothing", async () => {
    const exceeded = alertRecord({
      type: "ALLOCATION_EXCEEDED",
      severity: "ERROR",
      deduplicationKey: "ae:ws-1:contract-1",
    });
    const alertRepos = repos({
      alerts: {
        findActiveAlertByContractAndType: vi.fn().mockImplementation(
          async (_workspaceId, _contractId, type) =>
            type === "ALLOCATION_EXCEEDED" ? exceeded : null,
        ),
      },
    });

    const { result } = await evaluate(
      view({ allocatedMinutes: null, remainingMinutes: null, allocationStatus: null }),
      alertRepos,
    );

    expect(result.exceeded.action).toBe("resolved");
    expect(result.alertsCreated).toBe(0);
    expect(alertRepos.alerts.createAlert).not.toHaveBeenCalled();
  });

  it("deduplicates an active alert and retriggers a resolved base key", async () => {
    const active = alertRecord();
    const resolved = alertRecord({ resolvedAt: new Date() });

    const deduped = await evaluate(
      view({ consumedMinutes: 800, remainingMinutes: 200, allocationStatus: "WARNING" }),
      repos({
        alerts: {
          findActiveAlertByContractAndType: vi.fn().mockResolvedValue(active),
        },
      }),
    );
    expect(deduped.result.warning.action).toBe("deduplicated");

    const retriggered = await evaluate(
      view({ consumedMinutes: 800, remainingMinutes: 200, allocationStatus: "WARNING" }),
      repos({
        alerts: {
          findAlertByDeduplicationKey: vi.fn().mockResolvedValue(resolved),
        },
      }),
    );
    expect(retriggered.result.warning.action).toBe("created");
    expect(retriggered.alertRepos.alerts.createAlert).toHaveBeenCalledWith(
      context.workspaceId,
      expect.objectContaining({
        type: "ALLOCATION_WARNING",
        invoiceId: null,
        periodStart: null,
        periodEnd: null,
        deduplicationKey: expect.stringMatching(/^aw:ws-1:contract-1:\d+$/),
      }),
    );
  });

  it("treats a unique-key race as deduplicated", async () => {
    const { result } = await evaluate(
      view({ consumedMinutes: 800, remainingMinutes: 200, allocationStatus: "WARNING" }),
      repos({
        alerts: {
          createAlert: vi.fn().mockRejectedValue(new UniqueConstraintViolationError("Alert")),
        },
      }),
    );
    expect(result.warning.action).toBe("deduplicated");
  });
});
