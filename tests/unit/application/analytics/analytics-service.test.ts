// tests/unit/application/analytics/analytics-service.test.ts
import { describe, expect, it, vi } from "vitest";

import { AnalyticsService, AnalyticsError } from "@/application/analytics/analytics-service";
import type { 
  AnalyticsPeriod,
  MonthlyHoursAnalytics,
  DailyAnalytics,
  ClientAllocation,
  ContractUtilization,
} from "@/domain/analytics-types";
import type { AnalyticsRepository, WorkspaceMemberRepository } from "@/domain/repositories";
import type { WorkspaceContext } from "@/application/workspace/workspace-context";
import type { WorkspaceMemberRecord } from "@/domain/persistence-types";
import { UnauthorizedWorkspaceAccessError } from "@/domain/workspace-errors";

const mockContext: WorkspaceContext = {
  workspaceId: "workspace-123",
  userId: "user-1",
  role: "OWNER",
  timezone: "UTC",
};

const mockMembership: WorkspaceMemberRecord = {
  workspaceId: "workspace-123",
  userId: "user-1",
  role: "OWNER",
  createdAt: new Date(),
};

const mockPeriod: AnalyticsPeriod = {
  startDate: new Date("2026-09-01"),
  endDate: new Date("2026-09-30"),
};

const mockMonthlyAnalytics: MonthlyHoursAnalytics = {
  period: mockPeriod,
  totalMinutes: 7200, // 120 hours
  billableMinutes: 5400, // 90 hours
  nonBillableMinutes: 1800, // 30 hours
  billablePercentage: 75,
  clientAllocations: [
    {
      clientId: "client-1",
      clientName: "ACME Corp",
      isArchived: false,
      totalMinutes: 3600,
      billableMinutes: 3000,
      percentage: 50,
    },
  ],
  contractUtilizations: [
    {
      contractId: "contract-1",
      clientName: "ACME Corp",
      isArchived: false,
      validFrom: new Date("2026-01-01T00:00:00.000Z"),
      validTo: new Date("2027-01-01T00:00:00.000Z"),
      isOngoing: false,
      consumedMinutes: 3600,
      contractedMinutes: 4800,
      utilizationPercentage: 75,
      isOutOfValidity: false,
    },
  ],
};

const mockDailyAnalytics: DailyAnalytics[] = [
  {
    workDate: new Date("2026-09-01"),
    totalMinutes: 480,
    billableMinutes: 360,
    nonBillableMinutes: 120,
    clientBreakdown: [
      {
        clientId: "client-1",
        clientName: "ACME Corp",
        totalMinutes: 480,
        billableMinutes: 360,
      },
    ],
  },
];

describe("AnalyticsService", () => {
  describe("getCurrentMonthAnalytics", () => {
    it("should get analytics for the current month when authorized", async () => {
      const mockAnalyticsRepository: AnalyticsRepository = {
        getMonthlyAnalytics: vi.fn().mockResolvedValue(mockMonthlyAnalytics),
        getDailyAnalytics: vi.fn(),
        getClientAllocations: vi.fn(),
        getContractUtilizations: vi.fn(),
        listTimeEntriesForPeriod: vi.fn().mockResolvedValue([]),
        listExpectedContracts: vi.fn().mockResolvedValue([]),
      };

      const mockMembersRepository: WorkspaceMemberRepository = {
        getMember: vi.fn().mockResolvedValue(mockMembership),
        addMember: vi.fn(),
        listMembers: vi.fn(),
        listMembershipsByUserId: vi.fn(),
      };

      const service = new AnalyticsService(mockAnalyticsRepository, mockMembersRepository);
      const result = await service.getCurrentMonthAnalytics(mockContext);

      expect(result).toMatchObject(mockMonthlyAnalytics);
      expect(result.accrued.byCurrency).toEqual([]);
      expect(result.expected.byCurrency).toEqual([]);
      expect(result).not.toHaveProperty("forecast");
      expect(mockMembersRepository.getMember).toHaveBeenCalledWith(
        mockContext.workspaceId,
        mockContext.userId
      );
      expect(mockAnalyticsRepository.getMonthlyAnalytics).toHaveBeenCalledWith(
        mockContext.workspaceId,
        expect.any(Object)
      );
    });

    it("should reject unauthorized access", async () => {
      const mockAnalyticsRepository: AnalyticsRepository = {
        getMonthlyAnalytics: vi.fn(),
        getDailyAnalytics: vi.fn(),
        getClientAllocations: vi.fn(),
        getContractUtilizations: vi.fn(),
        listTimeEntriesForPeriod: vi.fn(),
        listExpectedContracts: vi.fn(),
      };

      const mockMembersRepository: WorkspaceMemberRepository = {
        getMember: vi.fn().mockResolvedValue(null),
        addMember: vi.fn(),
        listMembers: vi.fn(),
        listMembershipsByUserId: vi.fn(),
      };

      const service = new AnalyticsService(mockAnalyticsRepository, mockMembersRepository);

      await expect(service.getCurrentMonthAnalytics(mockContext)).rejects.toThrow(
        UnauthorizedWorkspaceAccessError
      );
      expect(mockAnalyticsRepository.getMonthlyAnalytics).not.toHaveBeenCalled();
    });
  });

  describe("getMonthlyAnalytics", () => {
    it("should get monthly analytics for a valid period", async () => {
      const mockAnalyticsRepository: AnalyticsRepository = {
        getMonthlyAnalytics: vi.fn().mockResolvedValue(mockMonthlyAnalytics),
        getDailyAnalytics: vi.fn(),
        getClientAllocations: vi.fn(),
        getContractUtilizations: vi.fn(),
        listTimeEntriesForPeriod: vi.fn().mockResolvedValue([]),
        listExpectedContracts: vi.fn().mockResolvedValue([]),
      };

      const mockMembersRepository: WorkspaceMemberRepository = {
        getMember: vi.fn().mockResolvedValue(mockMembership),
        addMember: vi.fn(),
        listMembers: vi.fn(),
        listMembershipsByUserId: vi.fn(),
      };

      const service = new AnalyticsService(mockAnalyticsRepository, mockMembersRepository);
      const result = await service.getMonthlyAnalytics(mockContext, mockPeriod);

      expect(result).toMatchObject(mockMonthlyAnalytics);
      expect(result.totalMinutes).toBe(mockMonthlyAnalytics.totalMinutes);
      expect(result.billableMinutes).toBe(mockMonthlyAnalytics.billableMinutes);
      expect(result.billablePercentage).toBe(mockMonthlyAnalytics.billablePercentage);
      expect(result.accrued).toEqual({
        period: mockPeriod,
        timezone: "UTC",
        byCurrency: [],
        byContract: [],
      });
      expect(result.expected).toEqual({
        period: mockPeriod,
        timezone: "UTC",
        byCurrency: [],
        byContract: [],
      });
      expect(result).not.toHaveProperty("forecast");
      expect(mockAnalyticsRepository.getMonthlyAnalytics).toHaveBeenCalledWith(
        mockContext.workspaceId,
        mockPeriod
      );
    });

    it("composes Accrued and Expected without mixing currencies", async () => {
      const mockAnalyticsRepository: AnalyticsRepository = {
        getMonthlyAnalytics: vi.fn().mockResolvedValue(mockMonthlyAnalytics),
        getDailyAnalytics: vi.fn(),
        getClientAllocations: vi.fn(),
        getContractUtilizations: vi.fn(),
        listTimeEntriesForPeriod: vi.fn().mockResolvedValue([
          {
            contractId: "contract-eur",
            workDate: new Date("2026-09-02T00:00:00.000Z"),
            durationMinutes: 60,
            billable: true,
            snapshotBillingModel: "HOURLY",
            snapshotRate: "80.0000",
            snapshotCurrency: "EUR",
          },
          {
            contractId: "contract-usd",
            workDate: new Date("2026-09-03T00:00:00.000Z"),
            durationMinutes: 60,
            billable: true,
            snapshotBillingModel: "HOURLY",
            snapshotRate: "90.0000",
            snapshotCurrency: "USD",
          },
        ]),
        listExpectedContracts: vi.fn().mockResolvedValue([
          {
            contractId: "contract-eur",
            billingModel: "HOURLY",
            rate: "80.0000",
            currency: "EUR",
            monthlyContractedMinutes: 4800,
            validFrom: new Date("2026-01-01T00:00:00.000Z"),
            validTo: new Date("2027-01-01T00:00:00.000Z"),
          },
          {
            contractId: "contract-daily",
            billingModel: "DAILY",
            rate: "400.0000",
            currency: "USD",
            monthlyContractedMinutes: 4800,
            validFrom: new Date("2026-01-01T00:00:00.000Z"),
            validTo: new Date("2027-01-01T00:00:00.000Z"),
          },
          {
            contractId: "contract-unlimited",
            billingModel: "HOURLY",
            rate: "100.0000",
            currency: "GBP",
            monthlyContractedMinutes: null,
            validFrom: new Date("2026-01-01T00:00:00.000Z"),
            validTo: new Date("2027-01-01T00:00:00.000Z"),
          },
        ]),
      };

      const mockMembersRepository: WorkspaceMemberRepository = {
        getMember: vi.fn().mockResolvedValue(mockMembership),
        addMember: vi.fn(),
        listMembers: vi.fn(),
        listMembershipsByUserId: vi.fn(),
      };

      const service = new AnalyticsService(mockAnalyticsRepository, mockMembersRepository);
      const result = await service.getMonthlyAnalytics(mockContext, mockPeriod);

      expect(result.totalMinutes).toBe(7200);
      expect(result.accrued.byCurrency.map((row) => row.currency)).toEqual(["EUR", "USD"]);
      expect(result.accrued.byCurrency.find((row) => row.currency === "EUR")?.unrounded).toBe(80);
      expect(result.accrued.byCurrency.find((row) => row.currency === "USD")?.unrounded).toBe(90);
      expect(result.expected.byCurrency).toEqual([
        { currency: "EUR", unrounded: 6400, published: 6400 },
      ]);
      expect(result.expected.byContract.find((row) => row.contractId === "contract-daily")).toEqual({
        contractId: "contract-daily",
        currency: "USD",
        unrounded: null,
        published: null,
      });
      expect(result.expected.byContract.find((row) => row.contractId === "contract-unlimited")).toEqual({
        contractId: "contract-unlimited",
        currency: "GBP",
        unrounded: null,
        published: null,
      });
      expect(result.accrued).not.toHaveProperty("total");
      expect(result.expected).not.toHaveProperty("total");
    });

    it("should throw error for invalid period", async () => {
      const mockAnalyticsRepository: AnalyticsRepository = {
        getMonthlyAnalytics: vi.fn(),
        getDailyAnalytics: vi.fn(),
        getClientAllocations: vi.fn(),
        getContractUtilizations: vi.fn(),
        listTimeEntriesForPeriod: vi.fn(),
        listExpectedContracts: vi.fn(),
      };

      const invalidPeriod: AnalyticsPeriod = {
        startDate: new Date("2026-09-30"),
        endDate: new Date("2026-09-01"), // end before start
      };

      const mockMembersRepository: WorkspaceMemberRepository = {
        getMember: vi.fn().mockResolvedValue(mockMembership),
        addMember: vi.fn(),
        listMembers: vi.fn(),
        listMembershipsByUserId: vi.fn(),
      };

      const service = new AnalyticsService(mockAnalyticsRepository, mockMembersRepository);
      
      await expect(service.getMonthlyAnalytics(mockContext, invalidPeriod))
        .rejects.toThrow(AnalyticsError);
      
      expect(mockAnalyticsRepository.getMonthlyAnalytics).not.toHaveBeenCalled();
    });
  });

  describe("getDailyAnalytics", () => {
    it("should get daily analytics for a valid period", async () => {
      const mockAnalyticsRepository: AnalyticsRepository = {
        getMonthlyAnalytics: vi.fn(),
        getDailyAnalytics: vi.fn().mockResolvedValue(mockDailyAnalytics),
        getClientAllocations: vi.fn(),
        getContractUtilizations: vi.fn(),
        listTimeEntriesForPeriod: vi.fn(),
        listExpectedContracts: vi.fn(),
      };

      const mockMembersRepository: WorkspaceMemberRepository = {
        getMember: vi.fn().mockResolvedValue(mockMembership),
        addMember: vi.fn(),
        listMembers: vi.fn(),
        listMembershipsByUserId: vi.fn(),
      };

      const service = new AnalyticsService(mockAnalyticsRepository, mockMembersRepository);
      const result = await service.getDailyAnalytics(mockContext, mockPeriod);

      expect(result).toEqual(mockDailyAnalytics);
      expect(mockAnalyticsRepository.getDailyAnalytics).toHaveBeenCalledWith(
        mockContext.workspaceId,
        mockPeriod
      );
    });

    it("should throw error for invalid period", async () => {
      const mockAnalyticsRepository: AnalyticsRepository = {
        getMonthlyAnalytics: vi.fn(),
        getDailyAnalytics: vi.fn(),
        getClientAllocations: vi.fn(),
        getContractUtilizations: vi.fn(),
        listTimeEntriesForPeriod: vi.fn(),
        listExpectedContracts: vi.fn(),
      };

      const invalidPeriod: AnalyticsPeriod = {
        startDate: new Date("2026-09-30"),
        endDate: new Date("2026-09-01"),
      };

      const mockMembersRepository: WorkspaceMemberRepository = {
        getMember: vi.fn().mockResolvedValue(mockMembership),
        addMember: vi.fn(),
        listMembers: vi.fn(),
        listMembershipsByUserId: vi.fn(),
      };

      const service = new AnalyticsService(mockAnalyticsRepository, mockMembersRepository);
      
      await expect(service.getDailyAnalytics(mockContext, invalidPeriod))
        .rejects.toThrow(AnalyticsError);
    });
  });

  describe("getClientAllocations", () => {
    it("should get client allocations for a valid period", async () => {
      const clientAllocations: ClientAllocation[] = [
        {
          clientId: "client-1",
          clientName: "ACME Corp",
          isArchived: false,
          totalMinutes: 3600,
          billableMinutes: 3000,
          percentage: 75,
        },
        {
          clientId: "client-2",
          clientName: "Beta Ltd",
          isArchived: true, // archived client per PD-104-001
          totalMinutes: 1200,
          billableMinutes: 900,
          percentage: 25,
        },
      ];

      const mockAnalyticsRepository: AnalyticsRepository = {
        getMonthlyAnalytics: vi.fn(),
        getDailyAnalytics: vi.fn(),
        getClientAllocations: vi.fn().mockResolvedValue(clientAllocations),
        getContractUtilizations: vi.fn(),
        listTimeEntriesForPeriod: vi.fn(),
        listExpectedContracts: vi.fn(),
      };

      const mockMembersRepository: WorkspaceMemberRepository = {
        getMember: vi.fn().mockResolvedValue(mockMembership),
        addMember: vi.fn(),
        listMembers: vi.fn(),
        listMembershipsByUserId: vi.fn(),
      };

      const service = new AnalyticsService(mockAnalyticsRepository, mockMembersRepository);
      const result = await service.getClientAllocations(mockContext, mockPeriod);

      expect(result).toEqual(clientAllocations);
      expect(result.some(c => c.isArchived)).toBe(true); // Verify archived clients included
    });
  });

  describe("getContractUtilizations", () => {
    it("should get contract utilizations with finite contracts", async () => {
      const utilizations: ContractUtilization[] = [
        {
          contractId: "contract-1",
          clientName: "ACME Corp",
          isArchived: false,
          validFrom: new Date("2026-01-01T00:00:00.000Z"),
          validTo: new Date("2027-01-01T00:00:00.000Z"),
          isOngoing: false,
          consumedMinutes: 3600,
          contractedMinutes: 4800,
          utilizationPercentage: 75,
          isOutOfValidity: false,
        },
      ];

      const mockAnalyticsRepository: AnalyticsRepository = {
        getMonthlyAnalytics: vi.fn(),
        getDailyAnalytics: vi.fn(),
        getClientAllocations: vi.fn(),
        getContractUtilizations: vi.fn().mockResolvedValue(utilizations),
        listTimeEntriesForPeriod: vi.fn(),
        listExpectedContracts: vi.fn(),
      };

      const mockMembersRepository: WorkspaceMemberRepository = {
        getMember: vi.fn().mockResolvedValue(mockMembership),
        addMember: vi.fn(),
        listMembers: vi.fn(),
        listMembershipsByUserId: vi.fn(),
      };

      const service = new AnalyticsService(mockAnalyticsRepository, mockMembersRepository);
      const result = await service.getContractUtilizations(mockContext, mockPeriod);

      expect(result).toEqual(utilizations);
    });

    it("should handle ongoing/unlimited contracts per PD-104-004", async () => {
      const utilizations: ContractUtilization[] = [
        {
          contractId: "contract-2",
          clientName: "Gamma Inc",
          isArchived: false,
          validFrom: new Date("2026-01-01T00:00:00.000Z"),
          validTo: null, // ongoing
          isOngoing: true,
          consumedMinutes: 2400,
          contractedMinutes: null, // unlimited — no capacity denominator
          utilizationPercentage: null,
          isOutOfValidity: false,
        },
      ];

      const mockAnalyticsRepository: AnalyticsRepository = {
        getMonthlyAnalytics: vi.fn(),
        getDailyAnalytics: vi.fn(),
        getClientAllocations: vi.fn(),
        getContractUtilizations: vi.fn().mockResolvedValue(utilizations),
        listTimeEntriesForPeriod: vi.fn(),
        listExpectedContracts: vi.fn(),
      };

      const mockMembersRepository: WorkspaceMemberRepository = {
        getMember: vi.fn().mockResolvedValue(mockMembership),
        addMember: vi.fn(),
        listMembers: vi.fn(),
        listMembershipsByUserId: vi.fn(),
      };

      const service = new AnalyticsService(mockAnalyticsRepository, mockMembersRepository);
      const result = await service.getContractUtilizations(mockContext, mockPeriod);

      expect(result).toEqual(utilizations);
      expect(result[0].isOngoing).toBe(true);
      expect(result[0].utilizationPercentage).toBe(null);
    });
  });

  describe("calculateBillablePercentage", () => {
    it("should calculate percentage for non-zero total", () => {
      const result = AnalyticsService.calculateBillablePercentage(75, 100);
      expect(result).toBe(75);
    });

    it("should return null for zero total per BR-104-011", () => {
      const result = AnalyticsService.calculateBillablePercentage(0, 0);
      expect(result).toBe(null);
    });

    it("should return 0% for zero billable with non-zero total", () => {
      const result = AnalyticsService.calculateBillablePercentage(0, 100);
      expect(result).toBe(0);
    });

    it("should return 100% for equal billable and total", () => {
      const result = AnalyticsService.calculateBillablePercentage(100, 100);
      expect(result).toBe(100);
    });
  });

  describe("calculateUtilizationPercentage", () => {
    it("should calculate percentage for finite contract", () => {
      const result = AnalyticsService.calculateUtilizationPercentage(75, 100);
      expect(result).toBe(75);
    });

    it("should return null for unlimited contract per PD-104-004", () => {
      const result = AnalyticsService.calculateUtilizationPercentage(100, null);
      expect(result).toBe(null);
    });

    it("should return null for zero contracted minutes", () => {
      const result = AnalyticsService.calculateUtilizationPercentage(100, 0);
      expect(result).toBe(null);
    });

    it("should handle over-utilization", () => {
      const result = AnalyticsService.calculateUtilizationPercentage(150, 100);
      expect(result).toBe(150);
    });
  });

  describe("formatDuration", () => {
    it("should format zero minutes", () => {
      expect(AnalyticsService.formatDuration(0)).toBe("0h");
    });

    it("should format hours only", () => {
      expect(AnalyticsService.formatDuration(120)).toBe("2h");
    });

    it("should format hours and minutes", () => {
      expect(AnalyticsService.formatDuration(125)).toBe("2h 5m");
    });

    it("should format minutes only", () => {
      expect(AnalyticsService.formatDuration(30)).toBe("0h 30m");
    });
  });

  describe("formatPercentage", () => {
    it("should format percentage with rounding", () => {
      expect(AnalyticsService.formatPercentage(75.7)).toBe("76%");
      expect(AnalyticsService.formatPercentage(75.2)).toBe("75%");
    });

    it("should return dash for null percentage", () => {
      expect(AnalyticsService.formatPercentage(null)).toBe("—");
    });

    it("should format zero percentage", () => {
      expect(AnalyticsService.formatPercentage(0)).toBe("0%");
    });
  });

  describe("isOngoingUtilization (BR-105-016: ongoing ≡ validTo === null)", () => {
    it("should return true for null validTo (ongoing contract)", () => {
      expect(AnalyticsService.isOngoingUtilization(null)).toBe(true);
    });

    it("should return false for a finite validTo date", () => {
      expect(AnalyticsService.isOngoingUtilization(new Date("2027-01-01"))).toBe(false);
      expect(AnalyticsService.isOngoingUtilization(new Date("2026-07-01"))).toBe(false);
    });
  });
});