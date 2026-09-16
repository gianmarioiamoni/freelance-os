// src/infrastructure/persistence/analytics-repository.ts
import type {
  AnalyticsPeriod,
  MonthlyAnalytics,
  DailyAnalytics,
  ClientAllocation,
  ContractUtilization,
} from "@/domain/analytics-types";
import type { AnalyticsRepository } from "@/domain/repositories";
import { withPersistenceErrors } from "@/infrastructure/persistence/map-prisma-error";
import type { PrismaExecutor } from "@/infrastructure/persistence/prisma-executor";
import { AnalyticsService } from "@/application/analytics/analytics-service";

export function createAnalyticsRepository(db: PrismaExecutor): AnalyticsRepository {
  return {
    async getMonthlyAnalytics(workspaceId: string, period: AnalyticsPeriod): Promise<MonthlyAnalytics> {
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

        // Get client allocations and contract utilizations
        const [clientAllocations, contractUtilizations] = await Promise.all([
          getClientAllocations(db, workspaceId, period, totalMinutes),
          getContractUtilizations(db, workspaceId, period),
        ]);

        return {
          period,
          totalMinutes,
          billableMinutes,
          nonBillableMinutes,
          billablePercentage,
          clientAllocations,
          contractUtilizations,
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

    async getClientAllocations(workspaceId: string, period: AnalyticsPeriod): Promise<ClientAllocation[]> {
      return withPersistenceErrors(async () => {
        const totalMinutes = await getTotalMinutesForPeriod(db, workspaceId, period);
        return getClientAllocations(db, workspaceId, period, totalMinutes);
      });
    },

    async getContractUtilizations(workspaceId: string, period: AnalyticsPeriod): Promise<ContractUtilization[]> {
      return withPersistenceErrors(async () => {
        return getContractUtilizations(db, workspaceId, period);
      });
    },
  };
}

// Helper function to get total minutes for a period
async function getTotalMinutesForPeriod(
  db: PrismaExecutor,
  workspaceId: string,
  period: AnalyticsPeriod
): Promise<number> {
  const result = await db.timeEntry.aggregate({
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
  return result._sum.durationMinutes ?? 0;
}

// Helper function to get client allocations including archived clients per PD-104-001
async function getClientAllocations(
  db: PrismaExecutor,
  workspaceId: string,
  period: AnalyticsPeriod,
  totalMinutes: number
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

// Helper function to get contract utilizations per PD-104-002
async function getContractUtilizations(
  db: PrismaExecutor,
  workspaceId: string,
  period: AnalyticsPeriod
): Promise<ContractUtilization[]> {
  // Get contract consumption (ALL tracked time per PD-104-002)
  const contractConsumption = await db.timeEntry.groupBy({
    by: ["contractId"],
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

  if (contractConsumption.length === 0) {
    return [];
  }

  // Get contract details with client names for contracts that were used
  const contractIds = contractConsumption.map(c => c.contractId);
  const contracts = await db.contract.findMany({
    where: {
      workspaceId,
      id: { in: contractIds },
    },
    include: {
      client: {
        select: {
          companyName: true,
        },
      },
    },
  });

  return contractConsumption
    .map(consumption => {
      const contract = contracts.find(c => c.id === consumption.contractId);
      if (!contract) {
        return null;
      }

      const consumedMinutes = consumption._sum.durationMinutes ?? 0;
      const contractedMinutes = contract.monthlyContractedMinutes;
      const isOngoing = contractedMinutes === null;
      const utilizationPercentage = AnalyticsService.calculateUtilizationPercentage(
        consumedMinutes,
        contractedMinutes
      );

      return {
        contractId: contract.id,
        clientName: contract.client.companyName,
        consumedMinutes,
        contractedMinutes,
        utilizationPercentage,
        isOngoing,
      };
    })
    .filter((util): util is ContractUtilization => util !== null)
    .sort((a, b) => b.consumedMinutes - a.consumedMinutes);
}