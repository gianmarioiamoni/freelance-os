// tests/unit/application/timesheet-viewer/get-authorized-time-entries.test.ts
import { describe, expect, it } from "vitest";

import { getAuthorizedTimeEntries } from "@/application/timesheet-viewer/get-authorized-time-entries";
import type { WorkspaceContext } from "@/application/workspace/workspace-context";
import type {
  TimeEntryRecord,
  TimesheetViewerAccessRecord,
  TimesheetViewerContractRecord,
} from "@/domain/persistence-types";
import type {
  TimeEntryRepository,
  ViewerAccessRepository,
} from "@/domain/repositories";
import {
  ViewerAccessNotFoundError,
  ViewerUnauthorizedError,
} from "@/domain/viewer-errors";

const context: WorkspaceContext = {
  workspaceId: "workspace-1",
  userId: "user-1",
  role: "OWNER",
  timezone: "UTC",
};

function createFakeViewerAccessRepository(
  viewers: TimesheetViewerAccessRecord[] = [],
  contracts: TimesheetViewerContractRecord[] = [],
): ViewerAccessRepository {
  return {
    async getById(workspaceId, viewerAccessId) {
      return (
        viewers.find(
          (v) => v.id === viewerAccessId && v.workspaceId === workspaceId,
        ) ?? null
      );
    },
    async listAuthorizedContracts(workspaceId, viewerAccessId) {
      return contracts.filter(
        (c) =>
          c.viewerAccessId === viewerAccessId && c.workspaceId === workspaceId,
      );
    },
  } as ViewerAccessRepository;
}

function createFakeTimeEntryRepository(
  entries: TimeEntryRecord[] = [],
): TimeEntryRepository {
  return {
    async listTimeEntriesForPeriod(workspaceId, startDate, endDate) {
      return entries.filter(
        (e) =>
          e.workspaceId === workspaceId &&
          e.workDate >= startDate &&
          e.workDate <= endDate,
      );
    },
  } as TimeEntryRepository;
}

describe("getAuthorizedTimeEntries", () => {
  it("returns time entries for authorized contracts only", async () => {
    const viewer: TimesheetViewerAccessRecord = {
      id: "viewer-1",
      workspaceId: context.workspaceId,
      userId: "user-2",
      email: "viewer@example.com",
      status: "ACTIVE",
      invitedAt: new Date(),
      activatedAt: new Date(),
      revokedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const authorized: TimesheetViewerContractRecord[] = [
      {
        viewerAccessId: "viewer-1",
        workspaceId: context.workspaceId,
        contractId: "contract-1",
        displayLabel: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    const entries: TimeEntryRecord[] = [
      {
        id: "entry-1",
        workspaceId: context.workspaceId,
        userId: "user-1",
        clientId: "client-1",
        contractId: "contract-1",
        workDate: new Date("2026-10-15"),
        durationMinutes: 120,
        description: "Work",
        billable: true,
        snapshotBillingModel: "HOURLY",
        snapshotRate: "50.00",
        snapshotCurrency: "EUR",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "entry-2",
        workspaceId: context.workspaceId,
        userId: "user-1",
        clientId: "client-2",
        contractId: "contract-2",
        workDate: new Date("2026-10-16"),
        durationMinutes: 180,
        description: "Other work",
        billable: true,
        snapshotBillingModel: "HOURLY",
        snapshotRate: "60.00",
        snapshotCurrency: "EUR",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    const viewerAccess = createFakeViewerAccessRepository([viewer], authorized);
    const timeEntries = createFakeTimeEntryRepository(entries);

    const result = await getAuthorizedTimeEntries(
      context,
      "viewer-1",
      {
        startDate: new Date("2026-10-01"),
        endDate: new Date("2026-10-31"),
      },
      viewerAccess,
      timeEntries,
    );

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("entry-1");
    expect(result[0].contractId).toBe("contract-1");
  });

  it("rejects if viewer is not active", async () => {
    const viewer: TimesheetViewerAccessRecord = {
      id: "viewer-1",
      workspaceId: context.workspaceId,
      userId: null,
      email: "viewer@example.com",
      status: "PENDING",
      invitedAt: new Date(),
      activatedAt: null,
      revokedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const viewerAccess = createFakeViewerAccessRepository([viewer], []);
    const timeEntries = createFakeTimeEntryRepository([]);

    await expect(
      getAuthorizedTimeEntries(
        context,
        "viewer-1",
        {
          startDate: new Date("2026-10-01"),
          endDate: new Date("2026-10-31"),
        },
        viewerAccess,
        timeEntries,
      ),
    ).rejects.toThrow(ViewerAccessNotFoundError);
  });

  it("rejects if viewer has no authorized contracts", async () => {
    const viewer: TimesheetViewerAccessRecord = {
      id: "viewer-1",
      workspaceId: context.workspaceId,
      userId: "user-2",
      email: "viewer@example.com",
      status: "ACTIVE",
      invitedAt: new Date(),
      activatedAt: new Date(),
      revokedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const viewerAccess = createFakeViewerAccessRepository([viewer], []);
    const timeEntries = createFakeTimeEntryRepository([]);

    await expect(
      getAuthorizedTimeEntries(
        context,
        "viewer-1",
        {
          startDate: new Date("2026-10-01"),
          endDate: new Date("2026-10-31"),
        },
        viewerAccess,
        timeEntries,
      ),
    ).rejects.toThrow(ViewerUnauthorizedError);
  });

  it("rejects if requested contractIds are not authorized", async () => {
    const viewer: TimesheetViewerAccessRecord = {
      id: "viewer-1",
      workspaceId: context.workspaceId,
      userId: "user-2",
      email: "viewer@example.com",
      status: "ACTIVE",
      invitedAt: new Date(),
      activatedAt: new Date(),
      revokedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const authorized: TimesheetViewerContractRecord[] = [
      {
        viewerAccessId: "viewer-1",
        workspaceId: context.workspaceId,
        contractId: "contract-1",
        displayLabel: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    const viewerAccess = createFakeViewerAccessRepository([viewer], authorized);
    const timeEntries = createFakeTimeEntryRepository([]);

    await expect(
      getAuthorizedTimeEntries(
        context,
        "viewer-1",
        {
          startDate: new Date("2026-10-01"),
          endDate: new Date("2026-10-31"),
          contractIds: ["contract-2"], // Not authorized
        },
        viewerAccess,
        timeEntries,
      ),
    ).rejects.toThrow(ViewerUnauthorizedError);
  });
});
