// tests/unit/application/alerts/evaluate-payment-alerts.test.ts
import { describe, expect, it, vi } from "vitest";

import { evaluateInvoicePaymentAlerts } from "@/application/alerts/evaluate-payment-alerts";
import { UniqueConstraintViolationError } from "@/domain/persistence-errors";
import { UnauthorizedWorkspaceAccessError } from "@/domain/workspace-errors";
import type {
  AlertRecord,
  InvoiceRecord,
  NotificationRecord,
  PaymentRecord,
} from "@/domain/persistence-types";
import type {
  AlertRepository,
  InvoiceRepository,
  NotificationRepository,
  PaymentRepository,
  WorkspaceMemberRepository,
} from "@/domain/repositories";
import type { WorkspaceContext } from "@/application/workspace/workspace-context";

const context: WorkspaceContext = {
  workspaceId: "ws-1",
  userId: "user-1",
  role: "OWNER",
  timezone: "UTC",
};

function calendarDate(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

function invoiceRecord(overrides: Partial<InvoiceRecord> = {}): InvoiceRecord {
  return {
    id: "invoice-1",
    workspaceId: context.workspaceId,
    contractId: "contract-1",
    invoiceDate: calendarDate("2026-09-01"),
    amount: "1000.0000",
    currency: "EUR",
    reference: "INV-1",
    paymentTermsDays: 30,
    dueDate: calendarDate("2026-10-01"),
    voidedAt: null,
    createdAt: calendarDate("2026-09-01"),
    updatedAt: calendarDate("2026-09-01"),
    ...overrides,
  };
}

function paymentRecord(overrides: Partial<PaymentRecord> = {}): PaymentRecord {
  return {
    id: "payment-1",
    workspaceId: context.workspaceId,
    invoiceId: "invoice-1",
    paymentDate: calendarDate("2026-09-15"),
    amount: "400.0000",
    currency: "EUR",
    notes: null,
    createdAt: calendarDate("2026-09-15"),
    updatedAt: calendarDate("2026-09-15"),
    ...overrides,
  };
}

function alertRecord(overrides: Partial<AlertRecord> = {}): AlertRecord {
  return {
    id: "alert-1",
    workspaceId: context.workspaceId,
    type: "PAYMENT_PARTIAL",
    severity: "INFO",
    clientId: null,
    contractId: "contract-1",
    invoiceId: "invoice-1",
    periodStart: null,
    periodEnd: null,
    deduplicationKey: "pp:ws-1:invoice-1",
    createdAt: new Date("2026-09-15T08:00:00.000Z"),
    resolvedAt: null,
    ...overrides,
  };
}

function notificationRecord(overrides: Partial<NotificationRecord> = {}): NotificationRecord {
  return {
    id: "notif-1",
    workspaceId: context.workspaceId,
    userId: context.userId,
    alertId: "alert-1",
    type: "ALERT",
    title: "Partial payment",
    body: "Invoice is partially paid.",
    readAt: null,
    createdAt: new Date("2026-09-15T08:00:00.000Z"),
    ...overrides,
  };
}

function createRepos(options: {
  invoice?: InvoiceRecord | null;
  payments?: PaymentRecord[];
  member?: boolean;
  alerts?: Partial<AlertRepository>;
}) {
  const created: AlertRecord[] = [];
  const invoices: InvoiceRepository = {
    createInvoice: vi.fn(),
    getInvoice: vi.fn().mockResolvedValue(options.invoice ?? null),
    lockInvoice: vi.fn(),
    listInvoicesForContract: vi.fn(),
    updateInvoice: vi.fn(),
    voidInvoice: vi.fn(),
    existsForContract: vi.fn(),
  };
  const payments: PaymentRepository = {
    createPayment: vi.fn(),
    getPayment: vi.fn(),
    listPaymentsForInvoice: vi.fn().mockResolvedValue(options.payments ?? []),
    updatePayment: vi.fn(),
    deletePayment: vi.fn(),
  };
  const members: WorkspaceMemberRepository = {
    addMember: vi.fn(),
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
    listMembers: vi.fn(),
    listMembershipsByUserId: vi.fn(),
  };
  const alerts: AlertRepository = {
    createAlert: vi.fn().mockImplementation(async (_workspaceId, input) => {
      const createdAlert = alertRecord({
        id: `alert-${created.length + 1}`,
        type: input.type,
        severity: input.severity,
        invoiceId: input.invoiceId ?? null,
        contractId: input.contractId ?? null,
        deduplicationKey: input.deduplicationKey,
      });
      created.push(createdAlert);
      return createdAlert;
    }),
    getAlert: vi.fn(),
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

  return { invoices, payments, members, alerts, notifications, created };
}

describe("evaluateInvoicePaymentAlerts", () => {
  it("creates no payment alerts when there are no payments", async () => {
    const repos = createRepos({ invoice: invoiceRecord() });
    const result = await evaluateInvoicePaymentAlerts(
      context,
      "invoice-1",
      repos,
      calendarDate("2026-09-20"),
    );

    expect(result.alertsCreated).toBe(0);
    expect(repos.alerts.createAlert).not.toHaveBeenCalled();
  });

  it("creates PAYMENT_PARTIAL for a partial paid amount", async () => {
    const repos = createRepos({
      invoice: invoiceRecord(),
      payments: [paymentRecord()],
    });
    const result = await evaluateInvoicePaymentAlerts(
      context,
      "invoice-1",
      repos,
      calendarDate("2026-09-20"),
    );

    expect(result.partial.action).toBe("created");
    expect(result.overdue.action).toBe("none");
    expect(result.mismatch.action).toBe("none");
    expect(repos.alerts.createAlert).toHaveBeenCalledWith(
      "ws-1",
      expect.objectContaining({
        type: "PAYMENT_PARTIAL",
        severity: "INFO",
        invoiceId: "invoice-1",
      }),
    );
  });

  it("does not create PAYMENT_PARTIAL when the invoice is paid", async () => {
    const repos = createRepos({
      invoice: invoiceRecord(),
      payments: [paymentRecord({ amount: "1000.0000" })],
    });
    const result = await evaluateInvoicePaymentAlerts(
      context,
      "invoice-1",
      repos,
      calendarDate("2026-09-20"),
    );

    expect(result.alertsCreated).toBe(0);
  });

  it("creates PAYMENT_MISMATCH without OVERDUE when overpaid after due date", async () => {
    const repos = createRepos({
      invoice: invoiceRecord(),
      payments: [paymentRecord({ amount: "1200.0000" })],
    });
    const result = await evaluateInvoicePaymentAlerts(
      context,
      "invoice-1",
      repos,
      calendarDate("2026-10-15"),
    );

    expect(result.mismatch.action).toBe("created");
    expect(result.overdue.action).toBe("none");
    expect(result.partial.action).toBe("none");
    expect(repos.alerts.createAlert).toHaveBeenCalledWith(
      "ws-1",
      expect.objectContaining({ type: "PAYMENT_MISMATCH", severity: "ERROR" }),
    );
  });

  it("creates PAYMENT_OVERDUE for unpaid after due date", async () => {
    const repos = createRepos({ invoice: invoiceRecord() });
    const result = await evaluateInvoicePaymentAlerts(
      context,
      "invoice-1",
      repos,
      calendarDate("2026-10-02"),
    );

    expect(result.overdue.action).toBe("created");
    expect(result.partial.action).toBe("none");
  });

  it("allows PAYMENT_PARTIAL and PAYMENT_OVERDUE together", async () => {
    const repos = createRepos({
      invoice: invoiceRecord(),
      payments: [paymentRecord()],
    });
    const result = await evaluateInvoicePaymentAlerts(
      context,
      "invoice-1",
      repos,
      calendarDate("2026-10-02"),
    );

    expect(result.partial.action).toBe("created");
    expect(result.overdue.action).toBe("created");
  });

  it("does not mark dueDate today or null dueDate as overdue", async () => {
    const today = await evaluateInvoicePaymentAlerts(
      context,
      "invoice-1",
      createRepos({ invoice: invoiceRecord() }),
      calendarDate("2026-10-01"),
    );
    const missing = await evaluateInvoicePaymentAlerts(
      context,
      "invoice-1",
      createRepos({
        invoice: invoiceRecord({ paymentTermsDays: null, dueDate: null }),
      }),
      calendarDate("2026-10-15"),
    );

    expect(today.overdue.action).toBe("none");
    expect(missing.overdue.action).toBe("none");
  });

  it("ignores a future paymentDate when evaluating predicates", async () => {
    const repos = createRepos({
      invoice: invoiceRecord(),
      payments: [paymentRecord({ paymentDate: calendarDate("2029-01-01") })],
    });
    const result = await evaluateInvoicePaymentAlerts(
      context,
      "invoice-1",
      repos,
      calendarDate("2026-09-20"),
    );

    expect(result.partial.action).toBe("created");
    expect(result.overdue.action).toBe("none");
  });

  it("uses Workspace.timezone for today", async () => {
    const auckland = {
      ...context,
      timezone: "Pacific/Auckland",
    };
    const losAngeles = {
      ...context,
      timezone: "America/Los_Angeles",
    };
    const now = new Date("2026-10-01T12:00:00.000Z");
    const invoice = invoiceRecord({ dueDate: calendarDate("2026-10-01") });

    const aucklandResult = await evaluateInvoicePaymentAlerts(
      auckland,
      "invoice-1",
      createRepos({ invoice }),
      now,
    );
    const laResult = await evaluateInvoicePaymentAlerts(
      losAngeles,
      "invoice-1",
      createRepos({ invoice }),
      now,
    );

    expect(aucklandResult.overdue.action).toBe("created");
    expect(laResult.overdue.action).toBe("none");
  });

  it("deduplicates an active condition and resolves when it ends", async () => {
    const active = alertRecord();
    const repos = createRepos({
      invoice: invoiceRecord(),
      payments: [paymentRecord()],
      alerts: {
        findActiveAlertByInvoiceAndType: vi.fn().mockImplementation(
          async (_workspaceId, _invoiceId, type) =>
            type === "PAYMENT_PARTIAL" ? active : null,
        ),
        findAlertByDeduplicationKey: vi.fn().mockResolvedValue(active),
      },
    });
    const first = await evaluateInvoicePaymentAlerts(
      context,
      "invoice-1",
      repos,
      calendarDate("2026-09-20"),
    );
    expect(first.partial.action).toBe("deduplicated");

    const paidRepos = createRepos({
      invoice: invoiceRecord(),
      payments: [paymentRecord({ amount: "1000.0000" })],
      alerts: {
        findActiveAlertByInvoiceAndType: vi.fn().mockImplementation(
          async (_workspaceId, _invoiceId, type) =>
            type === "PAYMENT_PARTIAL" ? active : null,
        ),
      },
    });
    const resolved = await evaluateInvoicePaymentAlerts(
      context,
      "invoice-1",
      paidRepos,
      calendarDate("2026-09-20"),
    );
    expect(resolved.partial.action).toBe("resolved");
    expect(paidRepos.alerts.resolveAlert).toHaveBeenCalled();
  });

  it("re-triggers a new occurrence after a resolved condition returns", async () => {
    const resolved = alertRecord({ resolvedAt: new Date("2026-09-16T00:00:00.000Z") });
    const repos = createRepos({
      invoice: invoiceRecord(),
      payments: [paymentRecord()],
      alerts: {
        findAlertByDeduplicationKey: vi.fn().mockResolvedValue(resolved),
      },
    });
    const result = await evaluateInvoicePaymentAlerts(
      context,
      "invoice-1",
      repos,
      calendarDate("2026-09-20"),
    );

    expect(result.partial.action).toBe("created");
    expect(repos.alerts.createAlert).toHaveBeenCalledWith(
      "ws-1",
      expect.objectContaining({
        deduplicationKey: expect.stringMatching(/^pp:ws-1:invoice-1:\d+$/),
      }),
    );
    expect(repos.notifications.createNotification).toHaveBeenCalled();
  });

  it("deduplicates a re-triggered active alert by invoice identity", async () => {
    const retriggered = alertRecord({
      id: "alert-retrigger",
      deduplicationKey: "pp:ws-1:invoice-1:123",
    });
    const repos = createRepos({
      invoice: invoiceRecord(),
      payments: [paymentRecord()],
      alerts: {
        findActiveAlertByInvoiceAndType: vi.fn().mockImplementation(
          async (_workspaceId, _invoiceId, type) =>
            type === "PAYMENT_PARTIAL" ? retriggered : null,
        ),
        findAlertByDeduplicationKey: vi.fn().mockResolvedValue(
          alertRecord({ resolvedAt: new Date() }),
        ),
      },
    });
    const result = await evaluateInvoicePaymentAlerts(
      context,
      "invoice-1",
      repos,
      calendarDate("2026-09-20"),
    );

    expect(result.partial.action).toBe("deduplicated");
    expect(repos.alerts.createAlert).not.toHaveBeenCalled();
  });

  it("treats a unique-key race as deduplicated", async () => {
    const repos = createRepos({
      invoice: invoiceRecord(),
      payments: [paymentRecord()],
      alerts: {
        createAlert: vi.fn().mockRejectedValue(new UniqueConstraintViolationError("Alert")),
      },
    });
    const result = await evaluateInvoicePaymentAlerts(
      context,
      "invoice-1",
      repos,
      calendarDate("2026-09-20"),
    );

    expect(result.partial.action).toBe("deduplicated");
  });

  it("resolves active payment alerts on a VOID invoice and does not create", async () => {
    const active = alertRecord();
    const repos = createRepos({
      invoice: invoiceRecord({ voidedAt: new Date("2026-09-22T10:00:00.000Z") }),
      payments: [paymentRecord()],
      alerts: {
        findActiveAlertByInvoiceAndType: vi.fn().mockImplementation(
          async (_workspaceId, _invoiceId, type) =>
            type === "PAYMENT_PARTIAL" ? active : null,
        ),
      },
    });
    const result = await evaluateInvoicePaymentAlerts(context, "invoice-1", repos);

    expect(result.partial.action).toBe("resolved");
    expect(result.alertsCreated).toBe(0);
    expect(repos.alerts.createAlert).not.toHaveBeenCalled();
  });

  it("rejects a non-member", async () => {
    const repos = createRepos({ invoice: invoiceRecord(), member: false });

    await expect(
      evaluateInvoicePaymentAlerts(context, "invoice-1", repos),
    ).rejects.toBeInstanceOf(UnauthorizedWorkspaceAccessError);
  });
});
