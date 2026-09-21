// src/infrastructure/persistence/analytics-repository.ts
import type {
  AnalyticsPeriod,
  MonthlyHoursAnalytics,
  DailyAnalytics,
  ClientAllocation,
  ContractUtilization,
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

    async listTimeEntriesForPeriod(
      workspaceId: string,
      period: AnalyticsPeriod,
    ): Promise<TimeEntryRecord[]> {
      return withPersistenceErrors(async () => {
        const rows = await db.timeEntry.findMany({
          where: {
            workspaceId,
            workDate: {
              gte: period.startDate,
              lte: period.endDate,
            },
          },
          orderBy: [{ workDate: "asc" }, { createdAt: "asc" }],
        });
        return rows.map(mapTimeEntry);
      });
    },

    async listExpectedContracts(
      workspaceId: string,
      period: AnalyticsPeriod,
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

// Helper function to get contract utilizations per PD-104-002, BR-105-016,
// BR-105-017, BR-105-018.
//
// Relevance-driven contract list (BR-105-018):
//   A contract is relevant if its [validFrom, validTo) interval overlaps the
//   period, OR it has consumption in the period. The union ensures that neither
//   a zero-consumption valid contract nor historical anomalous entries disappear.
//
// Pro-rata capacity (BR-105-017):
//   contractedMinutes is the pro-rated value for the reporting period.
//   null when monthlyContractedMinutes is null (no denominator invented).
//
// isOngoing (BR-105-016): validTo === null. Independent from capacity.
//
// isOutOfValidity (BR-105-018):
//   true when any consumed time falls outside [validFrom, validTo).
async function getContractUtilizations(
  db: PrismaExecutor,
  workspaceId: string,
  period: AnalyticsPeriod
): Promise<ContractUtilization[]> {
  // 1. Contracts with validity overlap with the period (validTo is exclusive).
  //    For ongoing contracts (validTo === null), treat as infinitely valid — OR filter applied.
  const validityOverlapContracts = await db.contract.findMany({
    where: {
      workspaceId,
      validFrom: { lte: period.endDate },
      OR: [
        { validTo: null },
        { validTo: { gt: period.startDate } },
      ],
    },
    include: {
      client: { select: { companyName: true, status: true } },
    },
  });

  // 2. Contracts with in-period consumption (may not overlap validity — historical data).
  const contractConsumption = await db.timeEntry.groupBy({
    by: ["contractId"],
    where: {
      workspaceId,
      workDate: {
        gte: period.startDate,
        lte: period.endDate,
      },
    },
    _sum: { durationMinutes: true },
  });

  // Build a map of in-period consumption by contractId.
  const consumptionMap = new Map(
    contractConsumption.map(c => [c.contractId, c._sum.durationMinutes ?? 0])
  );

  // Collect the union of contract IDs from both relevance criteria.
  const validityContractIds = new Set(validityOverlapContracts.map(c => c.id));
  const consumptionOnlyContractIds = contractConsumption
    .map(c => c.contractId)
    .filter(id => !validityContractIds.has(id));

  // 3. Fetch contracts present in consumption but not in the validity-overlap set.
  const extraContracts =
    consumptionOnlyContractIds.length > 0
      ? await db.contract.findMany({
          where: { workspaceId, id: { in: consumptionOnlyContractIds } },
          include: { client: { select: { companyName: true, status: true } } },
        })
      : [];

  const allContracts = [...validityOverlapContracts, ...extraContracts];

  if (allContracts.length === 0) {
    return [];
  }

  // 4. For each contract with in-period consumption, detect whether any time entry
  //    falls outside [validFrom, validTo) — the definition of out-of-validity (BR-105-018).
  //    We check by querying the count of entries outside validity for each contract.
  //
  //    Strategy: for each contract that has consumption in the period, check whether
  //    any workDate in the period is before validFrom or >= validTo.
  //    We do this as a single groupBy to avoid N+1 queries.
  const contractIdsWithConsumption = Array.from(consumptionMap.keys());
  const outOfValidityContractIds = new Set<string>();

  if (contractIdsWithConsumption.length > 0) {
    // For each contract, we need to check if there are entries where:
    //   workDate < validFrom  OR  (validTo IS NOT NULL AND workDate >= validTo)
    // We do a per-contract check using individual aggregate queries batched via Promise.all.
    const oovChecks = await Promise.all(
      allContracts
        .filter(c => consumptionMap.has(c.id))
        .map(async contract => {
          // Build the "out-of-validity" where clause for this contract.
          // A time entry is out-of-validity when workDate < validFrom OR (validTo IS NOT NULL AND workDate >= validTo).
          const outOfValidityConditions = contract.validTo === null
            ? [{ workDate: { lt: contract.validFrom } }]
            : [
                { workDate: { lt: contract.validFrom } },
                { workDate: { gte: contract.validTo } },
              ];

          const count = await db.timeEntry.count({
            where: {
              workspaceId,
              contractId: contract.id,
              workDate: { gte: period.startDate, lte: period.endDate },
              OR: outOfValidityConditions,
            },
          });
          return { contractId: contract.id, isOov: count > 0 };
        }),
    );

    for (const { contractId, isOov } of oovChecks) {
      if (isOov) outOfValidityContractIds.add(contractId);
    }
  }

  return allContracts
    .map(contract => {
      const consumedMinutes = consumptionMap.get(contract.id) ?? 0;

      // isOngoing: validTo === null (BR-105-016, independent from capacity).
      const isOngoing = contract.validTo === null;

      // Pro-rata contractedMinutes for this period (BR-105-017).
      const proRataContractedMinutes = AnalyticsService.calculateProRataCapacity(
        contract.monthlyContractedMinutes,
        contract.validFrom,
        contract.validTo,
        period,
      );

      // utilizationPercentage: null when capacity is null or 0 (BR-104-011).
      const utilizationPercentage = AnalyticsService.calculateUtilizationPercentage(
        consumedMinutes,
        proRataContractedMinutes,
      );

      // isOutOfValidity: true when any in-period workDate is outside [validFrom, validTo)
      // (BR-105-018). Determined by the per-contract count query above.
      const isOutOfValidity = outOfValidityContractIds.has(contract.id);

      return {
        contractId: contract.id,
        clientName: contract.client.companyName,
        isArchived: contract.client.status === "ARCHIVED",
        validFrom: contract.validFrom,
        validTo: contract.validTo,
        isOngoing,
        consumedMinutes,
        contractedMinutes: proRataContractedMinutes,
        utilizationPercentage,
        isOutOfValidity,
      };
    })
    .sort((a, b) => b.consumedMinutes - a.consumedMinutes);
}