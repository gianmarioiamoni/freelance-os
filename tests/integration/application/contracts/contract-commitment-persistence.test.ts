// tests/integration/application/contracts/contract-commitment-persistence.test.ts
import { describe, expect, it } from "vitest";

import { createClient } from "@/application/clients/create-client";
import { createContract } from "@/application/contracts/create-contract";
import { updateContract } from "@/application/contracts/update-contract";
import { createFirstWorkspace } from "@/application/workspace/create-first-workspace";
import type { WorkspaceContext } from "@/application/workspace/workspace-context";

import { repositories, runInTransaction } from "../../persistence/helpers";

describe("Contract Commitment Persistence", () => {
  async function createTestWorkspace(): Promise<WorkspaceContext> {
    const result = await createFirstWorkspace(
      `user-${Math.random().toString(36).slice(2)}`,
      {
        name: `Workspace ${Math.random().toString(36).slice(2, 8)}`,
        timezone: "Europe/Rome",
        currency: "EUR",
      },
      { runInTransaction },
    );
    return result.context;
  }

  describe("createContract", () => {
    it("creates contract with PERCENTAGE commitment", async () => {
      const context = await createTestWorkspace();
      const client = await createClient(
        context,
        { companyName: "Test Client A" },
        repositories.clients,
      );

      const contract = await createContract(
        context,
        {
          clientId: client.id,
          validFrom: "2026-09-21",
          validTo: "2026-10-31",
          billingModel: "HOURLY",
          rate: "80.50",
          currency: "EUR",
          commitmentMode: "PERCENTAGE",
          commitmentValue: "60",
        },
        repositories.clients,
        repositories.contracts,
      );

      expect(contract.commitmentMode).toBe("PERCENTAGE");
      expect(contract.commitmentPercentage).toBe(60);
      expect(contract.allocatedMinutes).toBe(8640); // 60% × 30 days × 8h × 60min
    });

    it("creates contract with TOTAL_HOURS commitment", async () => {
      const context = await createTestWorkspace();
      const client = await createClient(
        context,
        { companyName: "Test Client B" },
        repositories.clients,
      );

      const contract = await createContract(
        context,
        {
          clientId: client.id,
          validFrom: "2026-09-21",
          validTo: "2026-10-31",
          billingModel: "HOURLY",
          rate: "80.50",
          currency: "EUR",
          commitmentMode: "TOTAL_HOURS",
          commitmentValue: "144", // Equivalent to 60%
        },
        repositories.clients,
        repositories.contracts,
      );

      expect(contract.commitmentMode).toBe("TOTAL_HOURS");
      expect(contract.commitmentPercentage).toBe(60);
      expect(contract.allocatedMinutes).toBe(8640);
    });

    it("creates ongoing contract with null allocatedMinutes", async () => {
      const context = await createTestWorkspace();
      const client = await createClient(
        context,
        { companyName: "Test Client C" },
        repositories.clients,
      );

      const contract = await createContract(
        context,
        {
          clientId: client.id,
          validFrom: "2026-09-21",
          validTo: null,
          billingModel: "HOURLY",
          rate: "80.50",
          currency: "EUR",
          commitmentMode: "PERCENTAGE",
          commitmentValue: "60",
        },
        repositories.clients,
        repositories.contracts,
      );

      expect(contract.commitmentMode).toBe("PERCENTAGE");
      expect(contract.commitmentPercentage).toBe(60);
      expect(contract.allocatedMinutes).toBeNull();
    });
  });

  describe("updateContract", () => {
    it("recalculates allocatedMinutes when changing commitment percentage", async () => {
      const context = await createTestWorkspace();
      const client = await createClient(
        context,
        { companyName: "Test Client D" },
        repositories.clients,
      );

      const contract = await createContract(
        context,
        {
          clientId: client.id,
          validFrom: "2026-09-21",
          validTo: "2026-10-31",
          billingModel: "HOURLY",
          rate: "80.50",
          currency: "EUR",
          commitmentMode: "PERCENTAGE",
          commitmentValue: "60",
        },
        repositories.clients,
        repositories.contracts,
      );

      expect(contract.allocatedMinutes).toBe(8640);

      const updated = await runInTransaction(async () =>
        updateContract(
          context,
          contract.id,
          {
            validFrom: "2026-09-21",
            validTo: "2026-10-31",
            billingModel: "HOURLY",
            rate: "80.50",
            currency: "EUR",
            commitmentMode: "PERCENTAGE",
            commitmentValue: "80", // Changed from 60% to 80%
          },
          runInTransaction,
        ),
      );

      expect(updated.commitmentPercentage).toBe(80);
      expect(updated.allocatedMinutes).toBe(11520); // 80% × 30 days × 8h × 60min
    });

    it("recalculates allocatedMinutes when changing dates", async () => {
      const context = await createTestWorkspace();
      const client = await createClient(
        context,
        { companyName: "Test Client E" },
        repositories.clients,
      );

      const contract = await createContract(
        context,
        {
          clientId: client.id,
          validFrom: "2026-09-21",
          validTo: "2026-10-31",
          billingModel: "HOURLY",
          rate: "80.50",
          currency: "EUR",
          commitmentMode: "PERCENTAGE",
          commitmentValue: "60",
        },
        repositories.clients,
        repositories.contracts,
      );

      expect(contract.allocatedMinutes).toBe(8640);

      const updated = await runInTransaction(async () =>
        updateContract(
          context,
          contract.id,
          {
            validFrom: "2026-09-01",
            validTo: "2026-09-30", // 21 working days (Mon-Fri in Sept 2026)
            billingModel: "HOURLY",
            rate: "80.50",
            currency: "EUR",
            commitmentMode: "PERCENTAGE",
            commitmentValue: "60",
          },
          runInTransaction,
        ),
      );

      expect(updated.allocatedMinutes).toBe(6048); // 60% × 21 days × 8h × 60min
    });

    it("switches from PERCENTAGE to TOTAL_HOURS mode", async () => {
      const context = await createTestWorkspace();
      const client = await createClient(
        context,
        { companyName: "Test Client F" },
        repositories.clients,
      );

      const contract = await createContract(
        context,
        {
          clientId: client.id,
          validFrom: "2026-09-21",
          validTo: "2026-10-31",
          billingModel: "HOURLY",
          rate: "80.50",
          currency: "EUR",
          commitmentMode: "PERCENTAGE",
          commitmentValue: "60",
        },
        repositories.clients,
        repositories.contracts,
      );

      expect(contract.commitmentPercentage).toBe(60);

      const updated = await runInTransaction(async () =>
        updateContract(
          context,
          contract.id,
          {
            validFrom: "2026-09-21",
            validTo: "2026-10-31",
            billingModel: "HOURLY",
            rate: "80.50",
            currency: "EUR",
            commitmentMode: "TOTAL_HOURS",
            commitmentValue: "192", // 192h = 80% of 240h capacity
          },
          runInTransaction,
        ),
      );

      expect(updated.commitmentMode).toBe("TOTAL_HOURS");
      expect(updated.commitmentPercentage).toBe(80);
      expect(updated.allocatedMinutes).toBe(11520); // 80% × 30 days × 8h × 60min
    });

    it("converts finite contract to ongoing", async () => {
      const context = await createTestWorkspace();
      const client = await createClient(
        context,
        { companyName: "Test Client G" },
        repositories.clients,
      );

      const contract = await createContract(
        context,
        {
          clientId: client.id,
          validFrom: "2026-09-21",
          validTo: "2026-10-31",
          billingModel: "HOURLY",
          rate: "80.50",
          currency: "EUR",
          commitmentMode: "PERCENTAGE",
          commitmentValue: "60",
        },
        repositories.clients,
        repositories.contracts,
      );

      expect(contract.allocatedMinutes).toBe(8640);

      const updated = await runInTransaction(async () =>
        updateContract(
          context,
          contract.id,
          {
            validFrom: "2026-09-21",
            validTo: null, // Convert to ongoing
            billingModel: "HOURLY",
            rate: "80.50",
            currency: "EUR",
            commitmentMode: "PERCENTAGE",
            commitmentValue: "60",
          },
          runInTransaction,
        ),
      );

      expect(updated.allocatedMinutes).toBeNull(); // Ongoing has no finite budget
    });
  });

  describe("PERCENTAGE ↔ TOTAL_HOURS equivalence validation", () => {
    it("produces identical results for equivalent inputs", async () => {
      const context = await createTestWorkspace();

      const client1 = await createClient(
        context,
        { companyName: "Client Percentage" },
        repositories.clients,
      );

      const contract1 = await createContract(
        context,
        {
          clientId: client1.id,
          validFrom: "2026-09-21",
          validTo: "2026-10-31",
          billingModel: "HOURLY",
          rate: "80.50",
          currency: "EUR",
          commitmentMode: "PERCENTAGE",
          commitmentValue: "60",
        },
        repositories.clients,
        repositories.contracts,
      );

      const client2 = await createClient(
        context,
        { companyName: "Client TotalHours" },
        repositories.clients,
      );

      const contract2 = await createContract(
        context,
        {
          clientId: client2.id,
          validFrom: "2026-09-21",
          validTo: "2026-10-31",
          billingModel: "HOURLY",
          rate: "80.50",
          currency: "EUR",
          commitmentMode: "TOTAL_HOURS",
          commitmentValue: "144", // 60% of 240h capacity
        },
        repositories.clients,
        repositories.contracts,
      );

      expect(contract1.commitmentPercentage).toBe(contract2.commitmentPercentage);
      expect(contract1.allocatedMinutes).toBe(contract2.allocatedMinutes);
      expect(contract1.allocatedMinutes).toBe(8640);
    });
  });
});
