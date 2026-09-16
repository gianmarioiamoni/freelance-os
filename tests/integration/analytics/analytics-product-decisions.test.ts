// tests/integration/analytics/analytics-product-decisions.test.ts
import { beforeEach, describe, expect, it } from "vitest";
import { AnalyticsService } from "@/application/analytics/analytics-service";
import {
  currentMonthDay,
  februaryDayOfPreviousYear,
  lastDayOfCurrentMonth,
  lastDayOfPreviousMonth,
  monthOffsetDay,
} from "../current-month-dates";
import { createWorkspaceGraph } from "../persistence/fixtures";
import { repositories } from "../persistence/helpers";

describe("Analytics Product Decisions Verification", () => {
  let context: Awaited<ReturnType<typeof createWorkspaceGraph>>;
  let analyticsService: AnalyticsService;

  beforeEach(async () => {
    context = await createWorkspaceGraph(repositories, "Product Decisions Test");
    analyticsService = new AnalyticsService(repositories.analytics);
  });

  describe("PD-104-001: Archived Clients - Analytics INCLUDE archived client time", () => {
    it("includes time entries from archived clients in analytics totals", async () => {
      const workspaceContext = {
        workspaceId: context.workspaceId,
        userId: context.userId,
        role: "OWNER" as const,
      };

      // Create an active client
      const activeClient = await repositories.clients.createClient(context.workspaceId, {
        companyName: "Active Client Inc",
      });

      // Create a client that will be archived
      const clientToArchive = await repositories.clients.createClient(context.workspaceId, {
        companyName: "Will Be Archived Ltd",
      });

      // Create contracts for both clients
      const activeContract = await repositories.contracts.createContract(context.workspaceId, {
        clientId: activeClient.id,
        billingModel: "HOURLY",
        rate: "100.0000",
        currency: "EUR",
        monthlyContractedMinutes: 4800,
        validFrom: currentMonthDay(1),
        validTo: null,
      });

      const archivedContract = await repositories.contracts.createContract(context.workspaceId, {
        clientId: clientToArchive.id,
        billingModel: "HOURLY",
        rate: "120.0000",
        currency: "EUR",
        monthlyContractedMinutes: 3600,
        validFrom: currentMonthDay(1),
        validTo: null,
      });

      // Add time entries for both clients
      const workDate = currentMonthDay(15);

      // Active client time
      await repositories.timeEntries.recordTimeEntry(context.workspaceId, {
        userId: context.userId,
        clientId: activeClient.id,
        contractId: activeContract.id,
        workDate,
        durationMinutes: 300, // 5 hours
        description: "Active client work",
        billable: true,
      });

      // Client work before archiving
      await repositories.timeEntries.recordTimeEntry(context.workspaceId, {
        userId: context.userId,
        clientId: clientToArchive.id,
        contractId: archivedContract.id,
        workDate,
        durationMinutes: 240, // 4 hours
        description: "Work before archiving",
        billable: true,
      });

      // Archive the client AFTER recording time
      await repositories.clients.archiveClient(context.workspaceId, clientToArchive.id);

      // Add more time for archived client (should still be included)
      await repositories.timeEntries.recordTimeEntry(context.workspaceId, {
        userId: context.userId,
        clientId: clientToArchive.id,
        contractId: archivedContract.id,
        workDate: currentMonthDay(16),
        durationMinutes: 180, // 3 hours
        description: "Work after archiving",
        billable: false,
      });

      const analytics = await analyticsService.getCurrentMonthAnalytics(workspaceContext);

      // Verify totals include ALL time entries (active + archived client)
      expect(analytics.totalMinutes).toBe(720); // 5 + 4 + 3 = 12 hours
      expect(analytics.billableMinutes).toBe(540); // 5 + 4 = 9 hours billable
      expect(analytics.nonBillableMinutes).toBe(180); // 3 hours non-billable

      // Verify client allocations include archived client
      expect(analytics.clientAllocations).toHaveLength(2);
      
      const activeAllocation = analytics.clientAllocations.find(c => c.clientName === "Active Client Inc")!;
      expect(activeAllocation.totalMinutes).toBe(300);
      expect(activeAllocation.isArchived).toBe(false);

      const archivedAllocation = analytics.clientAllocations.find(c => c.clientName === "Will Be Archived Ltd")!;
      expect(archivedAllocation.totalMinutes).toBe(420); // 4 + 3 hours
      expect(archivedAllocation.billableMinutes).toBe(240); // Only first entry was billable
      expect(archivedAllocation.isArchived).toBe(true);
      expect(archivedAllocation.percentage).toBeCloseTo(58.33, 2); // 420/720

      // Verify contract utilizations include archived client contracts
      expect(analytics.contractUtilizations).toHaveLength(2);
      
      const archivedUtilization = analytics.contractUtilizations.find(c => c.clientName === "Will Be Archived Ltd")!;
      expect(archivedUtilization.consumedMinutes).toBe(420);
      expect(archivedUtilization.contractedMinutes).toBe(3600);
      expect(archivedUtilization.utilizationPercentage).toBeCloseTo(11.67, 2);
    });

    it("distinguishes archived clients visually in analytics results", async () => {
      const workspaceContext = {
        workspaceId: context.workspaceId,
        userId: context.userId,
        role: "OWNER" as const,
      };

      // Create and immediately archive a client
      const archivedClient = await repositories.clients.createClient(context.workspaceId, {
        companyName: "Archived From Start",
      });

      const contract = await repositories.contracts.createContract(context.workspaceId, {
        clientId: archivedClient.id,
        billingModel: "HOURLY",
        rate: "100.0000",
        currency: "EUR",
        monthlyContractedMinutes: null,
        validFrom: currentMonthDay(1),
        validTo: null,
      });

      await repositories.clients.archiveClient(context.workspaceId, archivedClient.id);

      // Add time entry to archived client
      await repositories.timeEntries.recordTimeEntry(context.workspaceId, {
        userId: context.userId,
        clientId: archivedClient.id,
        contractId: contract.id,
        workDate: currentMonthDay(15),
        durationMinutes: 360,
        description: "Work for archived client",
        billable: true,
      });

      const analytics = await analyticsService.getCurrentMonthAnalytics(workspaceContext);

      expect(analytics.clientAllocations).toHaveLength(1);
      expect(analytics.clientAllocations[0].isArchived).toBe(true);
      
      expect(analytics.contractUtilizations).toHaveLength(1);
      expect(analytics.contractUtilizations[0].clientName).toBe("Archived From Start");
    });
  });

  describe("PD-104-002: Contract Utilization - ALL tracked time (billable + non-billable)", () => {
    it("calculates utilization using ALL tracked time, not just billable time", async () => {
      const workspaceContext = {
        workspaceId: context.workspaceId,
        userId: context.userId,
        role: "OWNER" as const,
      };

      const client = await repositories.clients.getClient(context.workspaceId, context.clientId);
      if (!client) throw new Error("Client not found");

      const contract = await repositories.contracts.createContract(context.workspaceId, {
        clientId: client.id,
        billingModel: "HOURLY",
        rate: "100.0000",
        currency: "EUR",
        monthlyContractedMinutes: 2400, // 40 hours
        validFrom: currentMonthDay(1),
        validTo: null,
      });

      const workDate = currentMonthDay(15);

      // Add billable time
      await repositories.timeEntries.recordTimeEntry(context.workspaceId, {
        userId: context.userId,
        clientId: client.id,
        contractId: contract.id,
        workDate,
        durationMinutes: 600, // 10 hours billable
        description: "Billable development work",
        billable: true,
      });

      // Add non-billable time
      await repositories.timeEntries.recordTimeEntry(context.workspaceId, {
        userId: context.userId,
        clientId: client.id,
        contractId: contract.id,
        workDate,
        durationMinutes: 240, // 4 hours non-billable
        description: "Internal meetings and setup",
        billable: false,
      });

      const analytics = await analyticsService.getCurrentMonthAnalytics(workspaceContext);

      // Verify totals
      expect(analytics.totalMinutes).toBe(840); // 14 hours total
      expect(analytics.billableMinutes).toBe(600); // 10 hours billable
      expect(analytics.nonBillableMinutes).toBe(240); // 4 hours non-billable
      expect(analytics.billablePercentage).toBeCloseTo(71.43, 2); // 600/840

      // Verify utilization uses ALL time (billable + non-billable)
      expect(analytics.contractUtilizations).toHaveLength(1);
      const utilization = analytics.contractUtilizations[0];
      expect(utilization.consumedMinutes).toBe(840); // ALL tracked time
      expect(utilization.contractedMinutes).toBe(2400);
      expect(utilization.utilizationPercentage).toBe(35); // 840/2400 = 35%
      expect(utilization.isOngoing).toBe(false);
    });

    it("keeps billable percentage separate from utilization percentage", async () => {
      const workspaceContext = {
        workspaceId: context.workspaceId,
        userId: context.userId,
        role: "OWNER" as const,
      };

      const client = await repositories.clients.getClient(context.workspaceId, context.clientId);
      if (!client) throw new Error("Client not found");

      const contract = await repositories.contracts.createContract(context.workspaceId, {
        clientId: client.id,
        billingModel: "DAILY",
        rate: "800.0000",
        currency: "EUR",
        monthlyContractedMinutes: 4800, // 80 hours
        validFrom: currentMonthDay(1),
        validTo: null,
      });

      // Scenario: mostly non-billable time
      await repositories.timeEntries.recordTimeEntry(context.workspaceId, {
        userId: context.userId,
        clientId: client.id,
        contractId: contract.id,
        workDate: currentMonthDay(15),
        durationMinutes: 120, // 2 hours billable
        description: "Client-billable work",
        billable: true,
      });

      await repositories.timeEntries.recordTimeEntry(context.workspaceId, {
        userId: context.userId,
        clientId: client.id,
        contractId: contract.id,
        workDate: currentMonthDay(15),
        durationMinutes: 480, // 8 hours non-billable
        description: "Training, meetings, admin",
        billable: false,
      });

      const analytics = await analyticsService.getCurrentMonthAnalytics(workspaceContext);

      // Billable percentage should be low
      expect(analytics.billablePercentage).toBe(20); // 120/600 = 20%

      // But utilization percentage should include ALL time
      const utilization = analytics.contractUtilizations[0];
      expect(utilization.consumedMinutes).toBe(600); // All time
      expect(utilization.utilizationPercentage).toBe(12.5); // 600/4800 = 12.5%

      // These should be different values
      expect(analytics.billablePercentage).not.toBe(utilization.utilizationPercentage);
    });

    it("handles contracts without capacity denominator (unlimited contracts)", async () => {
      const workspaceContext = {
        workspaceId: context.workspaceId,
        userId: context.userId,
        role: "OWNER" as const,
      };

      const client = await repositories.clients.getClient(context.workspaceId, context.clientId);
      if (!client) throw new Error("Client not found");

      // Create unlimited contract (no monthlyContractedMinutes)
      const unlimitedContract = await repositories.contracts.createContract(context.workspaceId, {
        clientId: client.id,
        billingModel: "HOURLY",
        rate: "150.0000",
        currency: "EUR",
        monthlyContractedMinutes: null, // Unlimited
        validFrom: currentMonthDay(1),
        validTo: null,
      });

      await repositories.timeEntries.recordTimeEntry(context.workspaceId, {
        userId: context.userId,
        clientId: client.id,
        contractId: unlimitedContract.id,
        workDate: currentMonthDay(15),
        durationMinutes: 600, // 10 hours
        description: "Unlimited contract work",
        billable: true,
      });

      const analytics = await analyticsService.getCurrentMonthAnalytics(workspaceContext);

      expect(analytics.contractUtilizations).toHaveLength(1);
      const utilization = analytics.contractUtilizations[0];
      
      expect(utilization.consumedMinutes).toBe(600); // Time is still tracked
      expect(utilization.contractedMinutes).toBeNull(); // No capacity limit
      expect(utilization.utilizationPercentage).toBeNull(); // Cannot calculate percentage
      expect(utilization.isOngoing).toBe(true); // Unlimited contracts are ongoing
    });
  });

  describe("PD-104-003: Current Month Default Range", () => {
    it("includes only current month entries in default analytics", async () => {
      const workspaceContext = {
        workspaceId: context.workspaceId,
        userId: context.userId,
        role: "OWNER" as const,
      };

      const client = await repositories.clients.getClient(context.workspaceId, context.clientId);
      if (!client) throw new Error("Client not found");

      // Previous month entry (should be excluded)
      await repositories.timeEntries.recordTimeEntry(context.workspaceId, {
        userId: context.userId,
        clientId: client.id,
        contractId: context.contractId,
        workDate: lastDayOfPreviousMonth(), // last day of the previous month
        durationMinutes: 300,
        description: "Previous month work",
        billable: true,
      });

      // First day of current month (should be included)
      await repositories.timeEntries.recordTimeEntry(context.workspaceId, {
        userId: context.userId,
        clientId: client.id,
        contractId: context.contractId,
        workDate: currentMonthDay(1), // first day of the current month
        durationMinutes: 240,
        description: "First day of month",
        billable: true,
      });

      // Middle of current month (should be included)
      await repositories.timeEntries.recordTimeEntry(context.workspaceId, {
        userId: context.userId,
        clientId: client.id,
        contractId: context.contractId,
        workDate: currentMonthDay(15), // inside the current month
        durationMinutes: 360,
        description: "Mid-month work",
        billable: true,
      });

      // Next month entry (should be excluded from current month default)
      await repositories.timeEntries.recordTimeEntry(context.workspaceId, {
        userId: context.userId,
        clientId: client.id,
        contractId: context.contractId,
        workDate: monthOffsetDay(1, 1), // first day of the next month
        durationMinutes: 180,
        description: "Next month work",
        billable: true,
      });

      const analytics = await analyticsService.getCurrentMonthAnalytics(workspaceContext);

      // Should only include current month entries (September 1 & 15)
      expect(analytics.totalMinutes).toBe(600); // 240 + 360
      expect(analytics.billableMinutes).toBe(600);
    });

    it("handles month boundary correctly at end of month", async () => {
      const workspaceContext = {
        workspaceId: context.workspaceId,
        userId: context.userId,
        role: "OWNER" as const,
      };

      const client = await repositories.clients.getClient(context.workspaceId, context.clientId);
      if (!client) throw new Error("Client not found");

      // Last day of current month should be included
      await repositories.timeEntries.recordTimeEntry(context.workspaceId, {
        userId: context.userId,
        clientId: client.id,
        contractId: context.contractId,
        workDate: lastDayOfCurrentMonth(), // last day of the current month
        durationMinutes: 420,
        description: "Last day of month",
        billable: true,
      });

      const analytics = await analyticsService.getCurrentMonthAnalytics(workspaceContext);
      expect(analytics.totalMinutes).toBe(420);
    });

    it("handles leap year and varying month lengths correctly", async () => {
      const workspaceContext = {
        workspaceId: context.workspaceId,
        userId: context.userId,
        role: "OWNER" as const,
      };

      // Test that February entries (28/29 days) don't leak into other months.
      // February of the previous year is never the current month, whatever the
      // current month's own length is.

      const client = await repositories.clients.getClient(context.workspaceId, context.clientId);
      if (!client) throw new Error("Client not found");

      // Add entry for February 29 (if leap year, should be valid)
      // Note: 2026 is not a leap year, so Feb 29 doesn't exist
      
      // Add entry for February 28 (last day of February in non-leap year)
      await repositories.timeEntries.recordTimeEntry(context.workspaceId, {
        userId: context.userId,
        clientId: client.id,
        contractId: context.contractId,
        workDate: februaryDayOfPreviousYear(28), // February of the previous year
        durationMinutes: 240,
        description: "February work",
        billable: true,
      });

      // Current month analytics should not include February entry
      const analytics = await analyticsService.getCurrentMonthAnalytics(workspaceContext);
      expect(analytics.totalMinutes).toBe(0); // No current-month entries in this test
    });
  });

  describe("PD-104-004: Unlimited Contract Display Format", () => {
    it("displays finite contracts with validTo date", async () => {
      const workspaceContext = {
        workspaceId: context.workspaceId,
        userId: context.userId,
        role: "OWNER" as const,
      };

      const client = await repositories.clients.getClient(context.workspaceId, context.clientId);
      if (!client) throw new Error("Client not found");

      // Create finite contract
      const finiteContract = await repositories.contracts.createContract(context.workspaceId, {
        clientId: client.id,
        billingModel: "HOURLY",
        rate: "100.0000",
        currency: "EUR",
        monthlyContractedMinutes: 4800,
        validFrom: currentMonthDay(1), // first day of the current month
        validTo: monthOffsetDay(3, 28), // a finite end well after the current month
      });

      await repositories.timeEntries.recordTimeEntry(context.workspaceId, {
        userId: context.userId,
        clientId: client.id,
        contractId: finiteContract.id,
        workDate: currentMonthDay(15),
        durationMinutes: 480,
        description: "Finite contract work",
        billable: true,
      });

      const analytics = await analyticsService.getCurrentMonthAnalytics(workspaceContext);
      
      expect(analytics.contractUtilizations).toHaveLength(1);
      const utilization = analytics.contractUtilizations[0];
      
      expect(utilization.isOngoing).toBe(false); // Finite contract
      expect(utilization.contractedMinutes).toBe(4800);
      expect(utilization.utilizationPercentage).toBe(10); // 480/4800 = 10%
    });

    it("displays unlimited contracts (validTo = null) as ongoing", async () => {
      const workspaceContext = {
        workspaceId: context.workspaceId,
        userId: context.userId,
        role: "OWNER" as const,
      };

      const client = await repositories.clients.getClient(context.workspaceId, context.clientId);
      if (!client) throw new Error("Client not found");

      // Create unlimited contract
      const unlimitedContract = await repositories.contracts.createContract(context.workspaceId, {
        clientId: client.id,
        billingModel: "DAILY",
        rate: "800.0000",
        currency: "EUR",
        monthlyContractedMinutes: null, // Unlimited
        validFrom: currentMonthDay(1), // first day of the current month
        validTo: null, // Unlimited/ongoing
      });

      await repositories.timeEntries.recordTimeEntry(context.workspaceId, {
        userId: context.userId,
        clientId: client.id,
        contractId: unlimitedContract.id,
        workDate: currentMonthDay(15),
        durationMinutes: 600,
        description: "Unlimited contract work",
        billable: true,
      });

      const analytics = await analyticsService.getCurrentMonthAnalytics(workspaceContext);
      
      expect(analytics.contractUtilizations).toHaveLength(1);
      const utilization = analytics.contractUtilizations[0];
      
      expect(utilization.isOngoing).toBe(true); // Unlimited contract
      expect(utilization.contractedMinutes).toBeNull();
      expect(utilization.utilizationPercentage).toBeNull();
      expect(utilization.consumedMinutes).toBe(600); // Time is still tracked
    });

    it("correctly differentiates between finite and unlimited contracts in same workspace", async () => {
      const workspaceContext = {
        workspaceId: context.workspaceId,
        userId: context.userId,
        role: "OWNER" as const,
      };

      // Create two clients
      const client1 = await repositories.clients.createClient(context.workspaceId, {
        companyName: "Finite Client",
      });
      
      const client2 = await repositories.clients.createClient(context.workspaceId, {
        companyName: "Unlimited Client",
      });

      // Finite contract
      const finiteContract = await repositories.contracts.createContract(context.workspaceId, {
        clientId: client1.id,
        billingModel: "HOURLY",
        rate: "100.0000",
        currency: "EUR",
        monthlyContractedMinutes: 2400, // 40 hours
        validFrom: currentMonthDay(1),
        validTo: monthOffsetDay(1, 28), // ends inside the next month
      });

      // Unlimited contract
      const unlimitedContract = await repositories.contracts.createContract(context.workspaceId, {
        clientId: client2.id,
        billingModel: "HOURLY",
        rate: "120.0000",
        currency: "EUR",
        monthlyContractedMinutes: null,
        validFrom: currentMonthDay(1),
        validTo: null, // No end date
      });

      // Add time to both contracts
      const workDate = currentMonthDay(15);

      await repositories.timeEntries.recordTimeEntry(context.workspaceId, {
        userId: context.userId,
        clientId: client1.id,
        contractId: finiteContract.id,
        workDate,
        durationMinutes: 300,
        description: "Finite contract work",
        billable: true,
      });

      await repositories.timeEntries.recordTimeEntry(context.workspaceId, {
        userId: context.userId,
        clientId: client2.id,
        contractId: unlimitedContract.id,
        workDate,
        durationMinutes: 420,
        description: "Unlimited contract work",
        billable: true,
      });

      const analytics = await analyticsService.getCurrentMonthAnalytics(workspaceContext);
      
      expect(analytics.contractUtilizations).toHaveLength(2);

      const finiteUtilization = analytics.contractUtilizations.find(u => u.clientName === "Finite Client")!;
      expect(finiteUtilization.isOngoing).toBe(false);
      expect(finiteUtilization.contractedMinutes).toBe(2400);
      expect(finiteUtilization.utilizationPercentage).toBe(12.5); // 300/2400

      const unlimitedUtilization = analytics.contractUtilizations.find(u => u.clientName === "Unlimited Client")!;
      expect(unlimitedUtilization.isOngoing).toBe(true);
      expect(unlimitedUtilization.contractedMinutes).toBeNull();
      expect(unlimitedUtilization.utilizationPercentage).toBeNull();
    });
  });
});