// tests/unit/application/ai/ai-test-helpers.ts
import type { CurrentMonthAnalyticsReader } from "@/application/ai/tools/get-current-month-analytics-tool";
import type { WorkspaceContext } from "@/application/workspace/workspace-context";
import type { MonthlyAnalytics } from "@/domain/analytics-types";
import type { WorkspaceMemberRecord } from "@/domain/persistence-types";
import type { WorkspaceMemberRepository } from "@/domain/repositories";

export function workspaceContext(
  overrides: Partial<WorkspaceContext> = {},
): WorkspaceContext {
  return {
    workspaceId: "workspace-owned",
    userId: "user-1",
    role: "OWNER",
    timezone: "Europe/Rome",
    ...overrides,
  };
}

export function membersLookingUp(
  lookup: (
    workspaceId: string,
    userId: string,
  ) => WorkspaceMemberRecord | null,
): WorkspaceMemberRepository {
  return {
    addMember: async () => {
      throw new Error("not used");
    },
    getMember: async (workspaceId, userId) => lookup(workspaceId, userId),
    listMembers: async () => [],
    listMembershipsByUserId: async () => [],
  };
}

export function owningMembers(
  context: WorkspaceContext = workspaceContext(),
): WorkspaceMemberRepository {
  return membersLookingUp((workspaceId, userId) =>
    workspaceId === context.workspaceId && userId === context.userId
      ? {
          workspaceId,
          userId,
          role: context.role,
          createdAt: new Date("2026-01-01T00:00:00.000Z"),
        }
      : null,
  );
}

export function monthlyAnalyticsFixture(
  overrides: Partial<MonthlyAnalytics> = {},
): MonthlyAnalytics {
  const period = {
    startDate: new Date("2026-09-01T00:00:00.000Z"),
    endDate: new Date("2026-09-26T00:00:00.000Z"),
  };

  return {
    period,
    totalMinutes: 120,
    billableMinutes: 120,
    nonBillableMinutes: 0,
    billablePercentage: 100,
    clientAllocations: [],
    contractUtilizations: [],
    accrued: { period, timezone: "Europe/Rome", byCurrency: [], byContract: [] },
    expected: { period, timezone: "Europe/Rome", byCurrency: [], byContract: [] },
    forecast: null,
    ...overrides,
  };
}

export function stubCurrentMonthAnalytics(
  captured: { context?: WorkspaceContext } = {},
  result: MonthlyAnalytics = monthlyAnalyticsFixture(),
): CurrentMonthAnalyticsReader {
  return {
    async getCurrentMonthAnalytics(context) {
      captured.context = context;
      return result;
    },
  };
}
