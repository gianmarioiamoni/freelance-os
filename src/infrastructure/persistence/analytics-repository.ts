// src/infrastructure/persistence/analytics-repository.ts
import type {
  AnalyticsFilter,
  AnalyticsPeriod,
  MonthlyHoursAnalytics,
  DailyAnalytics,
  ClientAllocation,
  ContractAllocationFact,
  ContractUtilization,
  MonthlyHoursAllocation,
  ExpectedContractFact,
} from "@/domain/analytics-types";
import type { TimeEntryRecord } from "@/domain/persistence-types";
import type { AnalyticsRepository } from "@/domain/repositories";
import { withPersistenceErrors } from "@/infrastructure/persistence/map-prisma-error";
import { mapTimeEntry } from "@/infrastructure/persistence/mappers";
import type { PrismaExecutor } from "@/infrastructure/persistence/prisma-executor";
import { AnalyticsService } from "@/application/analytics/analytics-service";

export function createAnalyticsRepository(db: PrismaExecutor): AnalyticsRepository {
  return {
    async getMonthlyAnalytics(workspaceId: string, period: AnalyticsPeriod): Promise<MonthlyHoursAnalytics> {
      return withPersistenceErrors(async () => {
        // Get total aggregations
        const totalResult = await db.timeEntry.aggregate({
          where: {
            workspaceId,
            workDate: {
              gte: period.startDate,
              lte: period.endDate,
            },
          },
          _sum: {
            durationMinutes: true,
          },
        });

        const billableResult = await db.timeEntry.aggregate({
          where: {
            workspaceId,
            billable: true,
            workDate: {
              gte: period.startDate,
              lte: period.endDate,
            },
          },
          _sum: {
            durationMinutes: true,
          },
        });

        const totalMinutes = totalResult._sum.durationMinutes ?? 0;
        const billableMinutes = billableResult._sum.durationMinutes ?? 0;
        const nonBillableMinutes = totalMinutes - billableMinutes;
        const billablePercentage = AnalyticsService.calculateBillablePercentage(
          billableMinutes,
          totalMinutes
        );

        // Get client allocations, contract utilizations, and monthly hours allocations
        const [clientAllocations, contractUtilizations, monthlyHoursAllocations] = await Promise.all([
          getClientAllocations(db, workspaceId, period, totalMinutes),
          getContractUtilizations(db, workspaceId, period),
          getMonthlyHoursAllocations(db, workspaceId, period),
        ]);

        return {
          period,
          totalMinutes,
          billableMinutes,
          nonBillableMinutes,
          billablePercentage,
          clientAllocations,
          contractUtilizations,
          monthlyHoursAllocations,
        };
      });
    },

    async getDailyAnalytics(workspaceId: string, period: AnalyticsPeriod): Promise<DailyAnalytics[]> {
      return withPersistenceErrors(async () => {
        // Get daily totals
        const dailyTotals = await db.timeEntry.groupBy({
          by: ["workDate"],
          where: {
            workspaceId,
            workDate: {
              gte: period.startDate,
              lte: period.endDate,
            },
          },
          _sum: {
            durationMinutes: true,
          },
          orderBy: {
            workDate: "asc",
          },
        });

        // Get daily billable totals
        const dailyBillable = await db.timeEntry.groupBy({
          by: ["workDate"],
          where: {
            workspaceId,
            billable: true,
            workDate: {
              gte: period.startDate,
              lte: period.endDate,
            },
          },
          _sum: {
            durationMinutes: true,
          },
        });

        // Get daily client breakdowns
        const dailyClientData = await db.timeEntry.groupBy({
          by: ["workDate", "clientId"],
          where: {
            workspaceId,
            workDate: {
              gte: period.startDate,
              lte: period.endDate,
            },
          },
          _sum: {
            durationMinutes: true,
          },
        });

        const dailyClientBillable = await db.timeEntry.groupBy({
          by: ["workDate", "clientId"],
          where: {
            workspaceId,
            billable: true,
            workDate: {
              gte: period.startDate,
              lte: period.endDate,
            },
          },
          _sum: {
            durationMinutes: true,
          },
        });

        // Get client names (including archived clients per PD-104-001)
        const clientIds = Array.from(new Set(dailyClientData.map(d => d.clientId)));
        const clients = await db.client.findMany({
          where: {
            workspaceId,
            id: { in: clientIds },
          },
          select: {
            id: true,
            companyName: true,
          },
        });

        const clientNameMap = new Map(clients.map(c => [c.id, c.companyName]));
        const billableMap = new Map(
          dailyClientBillable.map(d => [`${d.workDate.toISOString()}-${d.clientId}`, d._sum.durationMinutes ?? 0])
        );

        // Build daily analytics
        const dailyMap = new Map<string, DailyAnalytics>();

        for (const total of dailyTotals) {
          const dateKey = total.workDate.toISOString();
          const billableMinutes = dailyBillable.find(b => 
            b.workDate.getTime() === total.workDate.getTime()
          )?._sum.durationMinutes ?? 0;

          dailyMap.set(dateKey, {
            workDate: total.workDate,
            totalMinutes: total._sum.durationMinutes ?? 0,
            billableMinutes,
            nonBillableMinutes: (total._sum.durationMinutes ?? 0) - billableMinutes,
            clientBreakdown: [],
          });
        }

        // Add client breakdowns
        for (const clientData of dailyClientData) {
          const dateKey = clientData.workDate.toISOString();
          const daily = dailyMap.get(dateKey);
          if (daily) {
            const billableKey = `${clientData.workDate.toISOString()}-${clientData.clientId}`;
            daily.clientBreakdown.push({
              clientId: clientData.clientId,
              clientName: clientNameMap.get(clientData.clientId) ?? 'Unknown Client',
              totalMinutes: clientData._sum.durationMinutes ?? 0,
              billableMinutes: billableMap.get(billableKey) ?? 0,
            });
          }
        }

        return Array.from(dailyMap.values()).sort((a, b) => a.workDate.getTime() - b.workDate.getTime());
      });
    },

    async getClientAllocations(
      workspaceId: string,
      period: AnalyticsPeriod,
      filter?: AnalyticsFilter,
    ): Promise<ClientAllocation[]> {
      return withPersistenceErrors(async () => {
        const totalMinutes = await getTotalMinutesForPeriod(db, workspaceId, period, filter);
        return getClientAllocations(db, workspaceId, period, totalMinutes, filter);
      });
    },

    async getContractUtilizations(
      workspaceId: string,
      period: AnalyticsPeriod,
      filter?: AnalyticsFilter,
    ): Promise<ContractUtilization[]> {
      return withPersistenceErrors(async () => {
        return getContractUtilizations(db, workspaceId, period, filter);
      });
    },

    async listTimeEntriesForPeriod(
      workspaceId: string,
      period: AnalyticsPeriod,
      filter?: AnalyticsFilter,
    ): Promise<TimeEntryRecord[]> {
      return withPersistenceErrors(async () => {
        const rows = await db.timeEntry.findMany({
          where: {
            workspaceId,
            workDate: {
              gte: period.startDate,
              lte: period.endDate,
            },
            ...timeEntryEntityWhere(filter),
          },
          orderBy: [{ workDate: "asc" }, { createdAt: "asc" }],
        });
        return rows.map(mapTimeEntry);
      });
    },

    async listExpectedContracts(
      workspaceId: string,
      period: AnalyticsPeriod,
      filter?: AnalyticsFilter,
    ): Promise<ExpectedContractFact[]> {
      return withPersistenceErrors(async () => {
        // Validity overlap only. TimeEntry consumption is not a relevance signal
        // for Expected (R2-OD-004). Archived clients are included (PD-104-001).
        const rows = await db.contract.findMany({
          where: {
            workspaceId,
            validFrom: { lte: period.endDate },
            OR: [
              { validTo: null },
              { validTo: { gt: period.startDate } },
            ],
            ...contractEntityWhere(filter),
          },
          orderBy: [{ id: "asc" }],
        });

        return rows.map((row) => ({
          contractId: row.id,
          billingModel: row.billingModel,
          rate: row.rate.toFixed(4),
          currency: row.currency,
          monthlyContractedMinutes: row.monthlyContractedMinutes,
          validFrom: row.validFrom,
          validTo: row.validTo,
        }));
      });
    },

    async getContractAllocationFact(
      workspaceId: string,
      contractId: string,
    ): Promise<ContractAllocationFact | null> {
      return withPersistenceErrors(async () => {
        const contract = await db.contract.findFirst({
          where: { id: contractId, workspaceId },
          select: {
            id: true,
            allocatedMinutes: true,
            validFrom: true,
            validTo: true,
          },
        });

        if (!contract) {
          return null;
        }

        const consumed = await db.timeEntry.aggregate({
          where: timeEntryValidityWhere(workspaceId, contract),
          _sum: { durationMinutes: true },
        });

        return {
          contractId: contract.id,
          allocatedMinutes: contract.allocatedMinutes,
          validFrom: contract.validFrom,
          validTo: contract.validTo,
          consumedMinutes: consumed._sum.durationMinutes ?? 0,
        };
      });
    },

    async listContractAllocationFacts(
      workspaceId: string,
      filter?: AnalyticsFilter,
    ): Promise<ContractAllocationFact[]> {
      return withPersistenceErrors(async () => {
        const contracts = await db.contract.findMany({
          where: { workspaceId, ...contractEntityWhere(filter) },
          select: {
            id: true,
            allocatedMinutes: true,
            validFrom: true,
            validTo: true,
          },
          orderBy: { id: "asc" },
        });

        if (contracts.length === 0) {
          return [];
        }

        const entries = await db.timeEntry.findMany({
          where: { workspaceId, ...timeEntryEntityWhere(filter) },
          select: {
            contractId: true,
            workDate: true,
            durationMinutes: true,
          },
        });

        return contracts.map((contract) => ({
          contractId: contract.id,
          allocatedMinutes: contract.allocatedMinutes,
          validFrom: contract.validFrom,
          validTo: contract.validTo,
          consumedMinutes: sumMinutesInValidity(entries, contract),
        }));
      });
    },
  };
}

type AllocationContractBounds = {
  id: string;
  validFrom: Date;
  validTo: Date | null;
};

function timeEntryEntityWhere(filter?: AnalyticsFilter): {
  clientId?: string;
  contractId?: string;
} {
  const where: { clientId?: string; contractId?: string } = {};
  if (filter?.clientId) {
    where.clientId = filter.clientId;
  }
  if (filter?.contractId) {
    where.contractId = filter.contractId;
  }
  return where;
}

function contractEntityWhere(filter?: AnalyticsFilter): {
  clientId?: string;
  id?: string;
} {
  const where: { clientId?: string; id?: string } = {};
  if (filter?.clientId) {
    where.clientId = filter.clientId;
  }
  if (filter?.contractId) {
    where.id = filter.contractId;
  }
  return where;
}

function timeEntryValidityWhere(
  workspaceId: string,
  contract: AllocationContractBounds,
) {
  return {
    workspaceId,
    contractId: contract.id,
    workDate: {
      gte: contract.validFrom,
      ...(contract.validTo ? { lt: contract.validTo } : {}),
    },
  };
}

function sumMinutesInValidity(
  entries: readonly {
    contractId: string;
    workDate: Date;
    durationMinutes: number;
  }[],
  contract: AllocationContractBounds,
): number {
  let consumed = 0;

  for (const entry of entries) {
    if (entry.contractId !== contract.id) {
      continue;
    }

    if (entry.workDate.getTime() < contract.validFrom.getTime()) {
      continue;
    }

    if (contract.validTo !== null && entry.workDate.getTime() >= contract.validTo.getTime()) {
      continue;
    }

    consumed += entry.durationMinutes;
  }

  return consumed;
}

// Helper function to get total minutes for a period
async function getTotalMinutesForPeriod(
  db: PrismaExecutor,
  workspaceId: string,
  period: AnalyticsPeriod,
  filter?: AnalyticsFilter,
): Promise<number> {
  const result = await db.timeEntry.aggregate({
    where: {
      workspaceId,
      workDate: {
        gte: period.startDate,
        lte: period.endDate,
      },
      ...timeEntryEntityWhere(filter),
    },
    _sum: {
      durationMinutes: true,
    },
  });
  return result._sum.durationMinutes ?? 0;
}

// Helper function to get client allocations including archived clients per PD-104-001
async function getClientAllocations(
  db: PrismaExecutor,
  workspaceId: string,
  period: AnalyticsPeriod,
  totalMinutes: number,
  filter?: AnalyticsFilter,
): Promise<ClientAllocation[]> {
  // Get client totals
  const clientTotals = await db.timeEntry.groupBy({
    by: ["clientId"],
    where: {
      workspaceId,
      workDate: {
        gte: period.startDate,
        lte: period.endDate,
      },
      ...timeEntryEntityWhere(filter),
    },
    _sum: {
      durationMinutes: true,
    },
  });

  // Get client billable totals
  const clientBillable = await db.timeEntry.groupBy({
    by: ["clientId"],
    where: {
      workspaceId,
      billable: true,
      workDate: {
        gte: period.startDate,
        lte: period.endDate,
      },
      ...timeEntryEntityWhere(filter),
    },
    _sum: {
      durationMinutes: true,
    },
  });

  // Get client details (including archived clients per PD-104-001)
  const clientIds = clientTotals.map(c => c.clientId);
  const clients = await db.client.findMany({
    where: {
      workspaceId,
      id: { in: clientIds },
    },
    select: {
      id: true,
      companyName: true,
      status: true,
    },
  });

  const clientMap = new Map(clients.map(c => [c.id, c]));
  const billableMap = new Map(clientBillable.map(c => [c.clientId, c._sum.durationMinutes ?? 0]));

  return clientTotals
    .map(total => {
      const client = clientMap.get(total.clientId);
      const clientMinutes = total._sum.durationMinutes ?? 0;
      const billableMinutes = billableMap.get(total.clientId) ?? 0;
      const percentage = AnalyticsService.calculateAllocationPercentage(
        clientMinutes,
        totalMinutes
      );

      return {
        clientId: total.clientId,
        clientName: client?.companyName ?? 'Unknown Client',
        isArchived: client?.status === "ARCHIVED",
        totalMinutes: clientMinutes,
        billableMinutes,
        percentage,
      };
    })
    .sort((a, b) => b.totalMinutes - a.totalMinutes);
}

// Helper function to get contract utilizations showing cumulative budget consumption.
// Shows lifetime consumption from contract.validFrom to now (or validTo) against allocatedMinutes.
// Contracts without allocatedMinutes are shown but without utilization percentage.
async function getContractUtilizations(
  db: PrismaExecutor,
  workspaceId: string,
  period: AnalyticsPeriod,
  filter?: AnalyticsFilter,
): Promise<ContractUtilization[]> {
  // Get all contracts that have any consumption in the lifetime
  // First, get contracts with consumption
  const contractConsumption = await db.timeEntry.groupBy({
    by: ["contractId"],
    where: {
      workspaceId,
      ...timeEntryEntityWhere(filter),
    },
    _sum: { durationMinutes: true },
  });

  if (contractConsumption.length === 0) {
    return [];
  }

  // Get contract details
  const contracts = await db.contract.findMany({
    where: {
      workspaceId,
      id: { in: contractConsumption.map(c => c.contractId) },
      ...contractEntityWhere(filter),
    },
    include: {
      client: { select: { companyName: true, status: true } },
    },
  });

  if (contracts.length === 0) {
    return [];
  }

  // For each contract, calculate cumulative consumption from validFrom to now (or validTo)
  const cumulativeConsumption = await Promise.all(
    contracts.map(async contract => {
      // Determine the end date for cumulative calculation
      // Use validTo if defined, otherwise use the period end date (today for current month dashboard)
      const cumulativeEndDate = contract.validTo 
        ? (contract.validTo < period.endDate ? contract.validTo : period.endDate)
        : period.endDate;

      const result = await db.timeEntry.aggregate({
        where: {
          workspaceId,
          contractId: contract.id,
          workDate: {
            gte: contract.validFrom,
            lte: cumulativeEndDate,
          },
          ...timeEntryEntityWhere(filter),
        },
        _sum: {
          durationMinutes: true,
        },
      });

      return {
        contractId: contract.id,
        cumulativeMinutes: result._sum.durationMinutes ?? 0,
      };
    })
  );

  const consumptionMap = new Map(
    cumulativeConsumption.map(c => [c.contractId, c.cumulativeMinutes])
  );

  return contracts
    .map(contract => {
      const consumedMinutes = consumptionMap.get(contract.id) ?? 0;
      const isOngoing = contract.validTo === null;
      
      // Use allocatedMinutes as total contract budget
      const contractedMinutes = contract.allocatedMinutes;

      // Calculate utilization percentage
      const utilizationPercentage = AnalyticsService.calculateUtilizationPercentage(
        consumedMinutes,
        contractedMinutes,
      );

      return {
        contractId: contract.id,
        clientName: contract.client.companyName,
        isArchived: contract.client.status === "ARCHIVED",
        validFrom: contract.validFrom,
        validTo: contract.validTo,
        isOngoing,
        consumedMinutes,
        contractedMinutes,
        utilizationPercentage,
        isOutOfValidity: false, // Not applicable for cumulative budget view
      };
    })
    .sort((a, b) => b.consumedMinutes - a.consumedMinutes);
}

// Helper function to get monthly hours allocations.
// Shows worked hours vs monthly allocation target for each contract.
// Monthly allocation is derived from allocatedMinutes or monthlyContractedMinutes.
async function getMonthlyHoursAllocations(
  db: PrismaExecutor,
  workspaceId: string,
  period: AnalyticsPeriod,
  filter?: AnalyticsFilter,
): Promise<MonthlyHoursAllocation[]> {
  // Get contracts with in-period consumption
  const contractConsumption = await db.timeEntry.groupBy({
    by: ["contractId"],
    where: {
      workspaceId,
      workDate: {
        gte: period.startDate,
        lte: period.endDate,
      },
      ...timeEntryEntityWhere(filter),
    },
    _sum: { durationMinutes: true },
  });

  if (contractConsumption.length === 0) {
    return [];
  }

  // Fetch contract details with allocation and capacity
  const contracts = await db.contract.findMany({
    where: {
      workspaceId,
      id: { in: contractConsumption.map(c => c.contractId) },
      ...contractEntityWhere(filter),
    },
    include: {
      client: { select: { companyName: true, status: true } },
    },
  });

  const consumptionMap = new Map(
    contractConsumption.map(c => [c.contractId, c._sum.durationMinutes ?? 0])
  );

  return contracts
    .map(contract => {
      const workedMinutes = consumptionMap.get(contract.id) ?? 0;

      // Monthly allocation is monthlyContractedMinutes only.
      // allocatedMinutes is total contract budget, not monthly allocation.
      const allocatedMinutes = contract.monthlyContractedMinutes;

      // Calculate percentage: workedMinutes / monthlyContractedMinutes × 100
      const percentage = AnalyticsService.calculateAllocationPercentage(
        workedMinutes,
        allocatedMinutes ?? 0,
      );

      return {
        contractId: contract.id,
        clientName: contract.client.companyName,
        isArchived: contract.client.status === "ARCHIVED",
        workedMinutes,
        allocatedMinutes,
        percentage,
      };
    })
    .filter(allocation => allocation.allocatedMinutes !== null) // Only show contracts with monthlyContractedMinutes
    .sort((a, b) => b.workedMinutes - a.workedMinutes);
}