// tests/unit/application/analytics/analytics-service.test.ts
import { describe, expect, it, vi } from "vitest";

import { AnalyticsService, AnalyticsError } from "@/application/analytics/analytics-service";
import type { 
  AnalyticsPeriod,
  MonthlyAnalytics,
  DailyAnalytics,
  ClientAllocation,
  ContractUtilization,
} from "@/domain/analytics-types";
import type { AnalyticsRepository } from "@/domain/repositories";
import type { WorkspaceContext } from "@/application/workspace/workspace-context";

const mockContext: WorkspaceContext = {
  workspaceId: "workspace-123",
  userId: "user-1",
  role: "OWNER",
};

const mockPeriod: AnalyticsPeriod = {
  startDate: new Date("2026-09-01"),
  endDate: new Date("2026-09-30"),
};

const mockMonthlyAnalytics: MonthlyAnalytics = {
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
      consumedMinutes: 3600,
      contractedMinutes: 4800,
      utilizationPercentage: 75,
      isOngoing: false,
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
    it("should get analytics for the current month", async () => {
      const mockAnalyticsRepository: AnalyticsRepository = {
        getMonthlyAnalytics: vi.fn().mockResolvedValue(mockMonthlyAnalytics),
        getDailyAnalytics: vi.fn(),
        getClientAllocations: vi.fn(),
        getContractUtilizations: vi.fn(),
      };

      const service = new AnalyticsService(mockAnalyticsRepository);
      const result = await service.getCurrentMonthAnalytics(mockContext);

      expect(result).toEqual(mockMonthlyAnalytics);
      expect(mockAnalyticsRepository.getMonthlyAnalytics).toHaveBeenCalledWith(
        mockContext.workspaceId,
        expect.any(Object)
      );
    });
  });

  describe("getMonthlyAnalytics", () => {
    it("should get monthly analytics for a valid period", async () => {
      const mockAnalyticsRepository: AnalyticsRepository = {
        getMonthlyAnalytics: vi.fn().mockResolvedValue(mockMonthlyAnalytics),
        getDailyAnalytics: vi.fn(),
        getClientAllocations: vi.fn(),
        getContractUtilizations: vi.fn(),
      };

      const service = new AnalyticsService(mockAnalyticsRepository);
      const result = await service.getMonthlyAnalytics(mockContext, mockPeriod);

      expect(result).toEqual(mockMonthlyAnalytics);
      expect(mockAnalyticsRepository.getMonthlyAnalytics).toHaveBeenCalledWith(
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
      };

      const invalidPeriod: AnalyticsPeriod = {
        startDate: new Date("2026-09-30"),
        endDate: new Date("2026-09-01"), // end before start
      };

      const service = new AnalyticsService(mockAnalyticsRepository);
      
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
      };

      const service = new AnalyticsService(mockAnalyticsRepository);
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
      };

      const invalidPeriod: AnalyticsPeriod = {
        startDate: new Date("2026-09-30"),
        endDate: new Date("2026-09-01"),
      };

      const service = new AnalyticsService(mockAnalyticsRepository);
      
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
      };

      const service = new AnalyticsService(mockAnalyticsRepository);
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
          consumedMinutes: 3600,
          contractedMinutes: 4800,
          utilizationPercentage: 75,
          isOngoing: false,
        },
      ];

      const mockAnalyticsRepository: AnalyticsRepository = {
        getMonthlyAnalytics: vi.fn(),
        getDailyAnalytics: vi.fn(),
        getClientAllocations: vi.fn(),
        getContractUtilizations: vi.fn().mockResolvedValue(utilizations),
      };

      const service = new AnalyticsService(mockAnalyticsRepository);
      const result = await service.getContractUtilizations(mockContext, mockPeriod);

      expect(result).toEqual(utilizations);
    });

    it("should handle ongoing/unlimited contracts per PD-104-004", async () => {
      const utilizations: ContractUtilization[] = [
        {
          contractId: "contract-2",
          clientName: "Gamma Inc",
          consumedMinutes: 2400,
          contractedMinutes: null, // unlimited contract
          utilizationPercentage: null,
          isOngoing: true,
        },
      ];

      const mockAnalyticsRepository: AnalyticsRepository = {
        getMonthlyAnalytics: vi.fn(),
        getDailyAnalytics: vi.fn(),
        getClientAllocations: vi.fn(),
        getContractUtilizations: vi.fn().mockResolvedValue(utilizations),
      };

      const service = new AnalyticsService(mockAnalyticsRepository);
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

  describe("isOngoingUtilization", () => {
    it("should return true for null contracted minutes", () => {
      expect(AnalyticsService.isOngoingUtilization(null)).toBe(true);
    });

    it("should return false for finite contracted minutes", () => {
      expect(AnalyticsService.isOngoingUtilization(4800)).toBe(false);
      expect(AnalyticsService.isOngoingUtilization(0)).toBe(false);
    });
  });
});