// tests/unit/application/ai/ai-test-helpers.ts
import type { AiAnalyticsServices } from "@/application/ai/ai-service-ports";
import type { CurrentMonthAnalyticsReader } from "@/application/ai/tools/get-current-month-analytics-tool";
import { ReportingService } from "@/application/reporting/reporting-service";
import type { AnalyticsService } from "@/application/analytics/analytics-service";
import type { WorkspaceContext } from "@/application/workspace/workspace-context";
import type {
  AccruedRevenue,
  ExpectedRevenue,
  MonthlyAnalytics,
} from "@/domain/analytics-types";
import type {
  ClientRecord,
  ContractRecord,
  WorkspaceMemberRecord,
} from "@/domain/persistence-types";
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
    clientAllocations: [
      {
        clientId: "client-1",
        clientName: "ACME",
        isArchived: false,
        totalMinutes: 120,
        billableMinutes: 120,
        percentage: 100,
      },
    ],
    monthlyHoursAllocations: [],
    contractUtilizations: [
      {
        contractId: "contract-1",
        clientName: "ACME",
        isArchived: false,
        validFrom: new Date("2026-01-01T00:00:00.000Z"),
        validTo: null,
        isOngoing: true,
        consumedMinutes: 120,
        contractedMinutes: 600,
        utilizationPercentage: 20,
        isOutOfValidity: false,
      },
    ],
    accrued: revenueFixture(period, 160),
    expected: expectedFixture(period, 6400),
    forecast: { ...revenueFixture(period, 160), elapsedPeriod: 26, totalPeriod: 26 },
    ...overrides,
  };
}

export function revenueFixture(
  period: { startDate: Date; endDate: Date },
  published = 160,
): AccruedRevenue {
  return {
    period,
    timezone: "Europe/Rome",
    byCurrency: [{ currency: "EUR", unrounded: published, published }],
    byContract: [{ contractId: "contract-1", currency: "EUR", unrounded: published, published }],
  };
}

export function expectedFixture(
  period: { startDate: Date; endDate: Date },
  published: number | null = 6400,
): ExpectedRevenue {
  return {
    period,
    timezone: "Europe/Rome",
    byCurrency: [{ currency: "EUR", unrounded: published ?? 0, published: published ?? 0 }],
    byContract: [
      { contractId: "contract-1", currency: "EUR", unrounded: published, published },
    ],
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

export function contractRecord(
  overrides: Partial<ContractRecord> = {},
): ContractRecord {
  return {
    id: "contract-1",
    workspaceId: "workspace-owned",
    clientId: "client-1",
    validFrom: new Date("2026-01-01T00:00:00.000Z"),
    validTo: null,
    billingModel: "HOURLY",
    rate: "80",
    currency: "EUR",
    monthlyContractedMinutes: 600,
    allocatedMinutes: 600,
    paymentTermsDays: 30,
    paymentTermsNote: "secret note",
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    ...overrides,
  };
}

export function clientRecord(
  overrides: Partial<ClientRecord> = {},
): ClientRecord {
  return {
    id: "client-1",
    workspaceId: "workspace-owned",
    companyName: "ACME",
    vatNumber: null,
    taxCode: null,
    address: null,
    contactName: null,
    email: null,
    phone: null,
    notes: null,
    status: "ACTIVE",
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    ...overrides,
  };
}

export function stubAnalyticsServices(
  overrides: Partial<AiAnalyticsServices> = {},
  captured: { context?: WorkspaceContext } = {},
): AiAnalyticsServices {
  const period = {
    startDate: new Date("2026-09-01T00:00:00.000Z"),
    endDate: new Date("2026-09-26T00:00:00.000Z"),
  };
  const monthly = monthlyAnalyticsFixture();
  const reporting = new ReportingService({} as AnalyticsService);
  const clients = [clientRecord()];
  const contracts = [contractRecord()];
  const contractAllocations = [
    {
      contractId: "contract-1",
      allocatedMinutes: 600,
      consumedMinutes: 480,
      remainingMinutes: 120,
      allocationStatus: "WARNING" as const,
    },
  ];

  return {
    resolvePeriod: (request, timezone, now) =>
      reporting.resolvePeriod(request, timezone, now),
    getCurrentMonthAnalytics: async (context) => {
      captured.context = context;
      return monthly;
    },
    getMonthlyAnalytics: async (context) => {
      captured.context = context;
      return monthly;
    },
    getAccruedRevenue: async (context) => {
      captured.context = context;
      return revenueFixture(period, 160);
    },
    getExpectedRevenue: async (context) => {
      captured.context = context;
      return expectedFixture(period, 6400);
    },
    getForecastRevenue: async (context) => {
      captured.context = context;
      return { ...revenueFixture(period, 160), elapsedPeriod: 26, totalPeriod: 26 };
    },
    getHoursByClient: async (context) => {
      captured.context = context;
      return {
        period,
        periodKind: { kind: "month" },
        filter: {},
        clientAllocations: monthly.clientAllocations,
      };
    },
    getContractReport: async (context) => {
      captured.context = context;
      return {
        period,
        periodKind: { kind: "month" },
        filter: {},
        contractUtilizations: monthly.contractUtilizations,
        contractAllocations,
        accrued: monthly.accrued,
        expected: monthly.expected,
        forecast: monthly.forecast,
      };
    },
    getAnnualOverview: async (context) => {
      captured.context = context;
      return { period, periodKind: { kind: "year" }, months: [monthly] };
    },
    listContractAllocations: async (context) => {
      captured.context = context;
      return contractAllocations;
    },
    getContractAllocation: async (context) => {
      captured.context = context;
      return contractAllocations[0];
    },
    listClients: async (context) => {
      captured.context = context;
      return clients.filter((row) => row.workspaceId === context.workspaceId);
    },
    getClient: async (context, clientId) => {
      captured.context = context;
      const client = clients.find(
        (row) => row.workspaceId === context.workspaceId && row.id === clientId,
      );
      if (!client) {
        const { ClientNotFoundError } = await import("@/domain/client-errors");
        throw new ClientNotFoundError();
      }
      return client;
    },
    listContracts: async (context) => {
      captured.context = context;
      return contracts.filter((row) => row.workspaceId === context.workspaceId);
    },
    listContractsForClient: async (context) => {
      captured.context = context;
      return [];
    },
    getContract: async (context, contractId) => {
      captured.context = context;
      if (contractId !== "contract-1") {
        const { ContractNotFoundError } = await import("@/domain/contract-errors");
        throw new ContractNotFoundError();
      }
      return contractRecord({ workspaceId: context.workspaceId });
    },
    listInvoicesForContract: async (context) => {
      captured.context = context;
      return [];
    },
    getInvoice: async () => {
      const { InvoiceNotFoundError } = await import("@/domain/invoice-errors");
      throw new InvoiceNotFoundError();
    },
    listPaymentsForInvoice: async () => [],
    getPayment: async () => {
      const { PaymentNotFoundError } = await import("@/domain/payment-errors");
      throw new PaymentNotFoundError();
    },
    getNotificationsForUser: async (context) => {
      captured.context = context;
      return [];
    },
    ...overrides,
  };
}
