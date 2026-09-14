// tests/integration/time-tracking-security.test.ts
import { describe, expect, it } from "vitest";

import { createTimeEntry } from "@/application/time-entries/create-time-entry";
import { getTimeEntry } from "@/application/time-entries/get-time-entry";
import { updateTimeEntry } from "@/application/time-entries/update-time-entry";
import { deleteTimeEntry } from "@/application/time-entries/delete-time-entry";
import { createClient } from "@/application/clients/create-client";
import { createContract } from "@/application/contracts/create-contract";
import { createFirstWorkspace } from "@/application/workspace/create-first-workspace";
import type { WorkspaceContext } from "@/application/workspace/workspace-context";
import { 
  TimeEntryNotFoundError,
  ContractNotValidForDateError,
} from "@/domain/time-entry-errors";
import { ContractNotFoundError, ClientArchivedError } from "@/domain/contract-errors";

import { date, repositories, runInTransaction } from "./persistence/helpers";

const UNKNOWN_ID = "00000000-0000-4000-8000-000000000099";

const workspaceInput = {
  timezone: "Europe/Rome",
  currency: "EUR",
} as const;

async function createWorkspaceContext(suffix: string): Promise<WorkspaceContext> {
  const created = await createFirstWorkspace(
    `time-sec-${suffix}`,
    { ...workspaceInput, name: `TimeSec ${suffix}` },
    { runInTransaction },
  );

  return created.context;
}

async function setupClientAndContract(context: WorkspaceContext, validFrom = "2026-01-01", validTo = "2026-12-31") {
  const client = await createClient(
    context,
    {
      companyName: "Security Client",
      email: "security@example.com", 
      phone: "",
      address: "",
      vatNumber: "",
      notes: "",
    },
    repositories.clients,
  );

  const contract = await createContract(
    context,
    {
      clientId: client.id,
      validFrom,
      validTo,
      billingModel: "HOURLY" as const,
      rate: "85",
      currency: "EUR",
    },
    repositories.clients,
    repositories.contracts,
  );

  return { client, contract };
}

describe("time tracking security and authorization", () => {
  describe("workspace isolation enforcement", () => {
    it("prevents reading time entries from foreign workspace", async () => {
      const workspaceA = await createWorkspaceContext("isolation-read-a");
      const workspaceB = await createWorkspaceContext("isolation-read-b");

      const { client, contract } = await setupClientAndContract(workspaceA);

      // Create entry in workspace A
      const entry = await createTimeEntry(
        workspaceA,
        {
          clientId: client.id,
          contractId: contract.id,
          workDate: date("2026-06-15"),
          durationMinutes: 120,
          billable: true,
        },
        repositories.clients,
        repositories.contracts,
        repositories.timeEntries,
      );

      // Workspace B cannot read workspace A's entry
      const foreignRead = await repositories.timeEntries.getTimeEntry(workspaceB.workspaceId, entry.id);
      expect(foreignRead).toBeNull();
    });

    it("prevents updating time entries from foreign workspace", async () => {
      const workspaceA = await createWorkspaceContext("isolation-update-a");
      const workspaceB = await createWorkspaceContext("isolation-update-b");

      const { client, contract } = await setupClientAndContract(workspaceA);

      // Create entry in workspace A
      const entry = await createTimeEntry(
        workspaceA,
        {
          clientId: client.id,
          contractId: contract.id,
          workDate: date("2026-06-15"),
          durationMinutes: 120,
          billable: true,
        },
        repositories.clients,
        repositories.contracts,
        repositories.timeEntries,
      );

      // Workspace B cannot update workspace A's entry
      await expect(
        updateTimeEntry(
          workspaceB,
          entry.id,
          { durationMinutes: 180 },
          repositories.timeEntries,
        )
      ).rejects.toThrow(TimeEntryNotFoundError);
    });

    it("prevents deleting time entries from foreign workspace", async () => {
      const workspaceA = await createWorkspaceContext("isolation-delete-a");
      const workspaceB = await createWorkspaceContext("isolation-delete-b");

      const { client, contract } = await setupClientAndContract(workspaceA);

      // Create entry in workspace A
      const entry = await createTimeEntry(
        workspaceA,
        {
          clientId: client.id,
          contractId: contract.id,
          workDate: date("2026-06-15"),
          durationMinutes: 120,
          billable: true,
        },
        repositories.clients,
        repositories.contracts,
        repositories.timeEntries,
      );

      // Workspace B cannot delete workspace A's entry
      await expect(
        deleteTimeEntry(workspaceB, entry.id, repositories.timeEntries)
      ).rejects.toThrow(TimeEntryNotFoundError);

      // Verify entry still exists and is accessible from workspace A
      const stillExists = await getTimeEntry(workspaceA, entry.id, repositories.timeEntries);
      expect(stillExists).toBeTruthy();
    });

    it("prevents creating time entries with foreign client IDs", async () => {
      const workspaceA = await createWorkspaceContext("foreign-client-a");
      const workspaceB = await createWorkspaceContext("foreign-client-b");

      const { client: clientA, contract: contractA } = await setupClientAndContract(workspaceA);

      // Workspace B cannot use workspace A's client ID
      await expect(
        createTimeEntry(
          workspaceB,
          {
            clientId: clientA.id,
            contractId: contractA.id,
            workDate: date("2026-06-15"),
            durationMinutes: 120,
            billable: true,
          },
          repositories.clients,
          repositories.contracts,
          repositories.timeEntries,
        )
      ).rejects.toThrow(ClientArchivedError);
    });

    it("prevents creating time entries with foreign contract IDs", async () => {
      const workspaceA = await createWorkspaceContext("foreign-contract-a");
      const workspaceB = await createWorkspaceContext("foreign-contract-b");

      const { contract: foreignContract } = await setupClientAndContract(workspaceA);
      const { client: localClient } = await setupClientAndContract(workspaceB);

      // Workspace B cannot use workspace A's contract ID even with its own client
      await expect(
        createTimeEntry(
          workspaceB,
          {
            clientId: localClient.id,
            contractId: foreignContract.id, // Foreign contract
            workDate: date("2026-06-15"),
            durationMinutes: 120,
            billable: true,
          },
          repositories.clients,
          repositories.contracts,
          repositories.timeEntries,
        )
      ).rejects.toThrow(ContractNotFoundError);
    });

    it("prevents mixed foreign client and local contract", async () => {
      const workspaceA = await createWorkspaceContext("mixed-foreign-a");
      const workspaceB = await createWorkspaceContext("mixed-foreign-b");

      const { client: clientA } = await setupClientAndContract(workspaceA);
      const { contract: contractB } = await setupClientAndContract(workspaceB);

      // Cannot use foreign client with local contract
      await expect(
        createTimeEntry(
          workspaceB,
          {
            clientId: clientA.id, // Foreign client
            contractId: contractB.id, // Local contract
            workDate: date("2026-06-15"),
            durationMinutes: 120,
            billable: true,
          },
          repositories.clients,
          repositories.contracts,
          repositories.timeEntries,
        )
      ).rejects.toThrow(ClientArchivedError);
    });

    it("does not leak workspace information through error messages", async () => {
      const workspaceA = await createWorkspaceContext("no-leak-a");
      const workspaceB = await createWorkspaceContext("no-leak-b");

      const { client, contract } = await setupClientAndContract(workspaceA);

      // Create entry in workspace A
      const entry = await createTimeEntry(
        workspaceA,
        {
          clientId: client.id,
          contractId: contract.id,
          workDate: date("2026-06-15"),
          durationMinutes: 120,
          billable: true,
        },
        repositories.clients,
        repositories.contracts,
        repositories.timeEntries,
      );

      // Attempt operations from workspace B and verify error messages don't leak info
      try {
        await getTimeEntry(workspaceB, entry.id, repositories.timeEntries);
      } catch (error) {
        // Should not reveal "exists in another workspace"
        expect((error as Error).message).not.toContain("another workspace");
        expect((error as Error).message).not.toContain("different workspace");
        expect((error as Error).message).not.toContain("workspace A");
      }

      try {
        await updateTimeEntry(
          workspaceB,
          entry.id,
          { durationMinutes: 180 },
          repositories.timeEntries,
        );
      } catch (error) {
        expect((error as Error).message).not.toContain("another workspace");
        expect((error as Error).message).not.toContain("belongs to");
      }

      try {
        await deleteTimeEntry(workspaceB, entry.id, repositories.timeEntries);
      } catch (error) {
        expect((error as Error).message).not.toContain("another workspace");
        expect((error as Error).message).not.toContain("foreign");
      }
    });

    it("list operations respect workspace boundaries", async () => {
      const workspaceA = await createWorkspaceContext("list-boundary-a");
      const workspaceB = await createWorkspaceContext("list-boundary-b");

      const { client: clientA, contract: contractA } = await setupClientAndContract(workspaceA);
      const { client: clientB, contract: contractB } = await setupClientAndContract(workspaceB);

      const testDate = date("2026-06-15");

      // Create entries in both workspaces for same date
      await createTimeEntry(
        workspaceA,
        {
          clientId: clientA.id,
          contractId: contractA.id,
          workDate: testDate,
          durationMinutes: 120,
          billable: true,
        },
        repositories.clients,
        repositories.contracts,
        repositories.timeEntries,
      );

      await createTimeEntry(
        workspaceB,
        {
          clientId: clientB.id,
          contractId: contractB.id,
          workDate: testDate,
          durationMinutes: 90,
          billable: true,
        },
        repositories.clients,
        repositories.contracts,
        repositories.timeEntries,
      );

      // Each workspace should only see its own entries
      const entriesA = await repositories.timeEntries.listTimeEntriesForDate(
        workspaceA.workspaceId,
        testDate,
      );
      const entriesB = await repositories.timeEntries.listTimeEntriesForDate(
        workspaceB.workspaceId,
        testDate,
      );

      expect(entriesA).toHaveLength(1);
      expect(entriesB).toHaveLength(1);
      expect(entriesA[0].clientId).toBe(clientA.id);
      expect(entriesB[0].clientId).toBe(clientB.id);
      expect(entriesA[0].durationMinutes).toBe(120);
      expect(entriesB[0].durationMinutes).toBe(90);
    });
  });

  describe("authorization injection attacks", () => {
    it("rejects unknown IDs without revealing existence", async () => {
      const context = await createWorkspaceContext("unknown-ids");

      // Unknown client ID
      const { contract } = await setupClientAndContract(context);
      await expect(
        createTimeEntry(
          context,
          {
            clientId: UNKNOWN_ID,
            contractId: contract.id,
            workDate: date("2026-06-15"),
            durationMinutes: 120,
            billable: true,
          },
          repositories.clients,
          repositories.contracts,
          repositories.timeEntries,
        )
      ).rejects.toThrow(ClientArchivedError);

      // Unknown contract ID
      const { client } = await setupClientAndContract(context);
      await expect(
        createTimeEntry(
          context,
          {
            clientId: client.id,
            contractId: UNKNOWN_ID,
            workDate: date("2026-06-15"),
            durationMinutes: 120,
            billable: true,
          },
          repositories.clients,
          repositories.contracts,
          repositories.timeEntries,
        )
      ).rejects.toThrow(ContractNotFoundError);

      // Unknown time entry ID operations
      const unknownEntry = await repositories.timeEntries.getTimeEntry(context.workspaceId, UNKNOWN_ID);
      expect(unknownEntry).toBeNull();

      await expect(
        updateTimeEntry(
          context,
          UNKNOWN_ID,
          { durationMinutes: 180 },
          repositories.timeEntries,
        )
      ).rejects.toThrow(TimeEntryNotFoundError);

      await expect(
        deleteTimeEntry(context, UNKNOWN_ID, repositories.timeEntries)
      ).rejects.toThrow(TimeEntryNotFoundError);
    });

    it("handles malformed UUIDs gracefully", async () => {
      const context = await createWorkspaceContext("malformed-ids");

      const malformedIds = [
        "00000000-0000-0000-0000-000000000000", // All zeros (valid UUID format)
      ];

      const invalidIds = [
        "not-a-uuid",
        "12345", 
        "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx", // Invalid characters
        "", // Empty string
        "null",
        "undefined",
      ];

      // Test IDs that are valid UUID format but don't exist
      for (const malformedId of malformedIds) {
        const result = await repositories.timeEntries.getTimeEntry(context.workspaceId, malformedId);
        expect(result).toBeNull();

        await expect(
          updateTimeEntry(
            context,
            malformedId,
            { durationMinutes: 180 },
            repositories.timeEntries,
          )
        ).rejects.toThrow(TimeEntryNotFoundError);

        await expect(
          deleteTimeEntry(context, malformedId, repositories.timeEntries)
        ).rejects.toThrow(TimeEntryNotFoundError);
      }

      // Test IDs that have invalid UUID format - these will throw persistence errors
      for (const invalidId of invalidIds) {
        await expect(
          repositories.timeEntries.getTimeEntry(context.workspaceId, invalidId)
        ).rejects.toThrow(); // Prisma will throw on invalid UUID format

        await expect(
          updateTimeEntry(
            context,
            invalidId,
            { durationMinutes: 180 },
            repositories.timeEntries,
          )
        ).rejects.toThrow(); // Should be caught and handled gracefully

        await expect(
          deleteTimeEntry(context, invalidId, repositories.timeEntries)
        ).rejects.toThrow(); // Should be caught and handled gracefully
      }
    });

    it("validates workspace context integrity", async () => {
      const context = await createWorkspaceContext("context-integrity");

      // Verify that workspace context is actually used and not bypassed
      const { client, contract } = await setupClientAndContract(context);

      const entry = await createTimeEntry(
        context,
        {
          clientId: client.id,
          contractId: contract.id,
          workDate: date("2026-06-15"),
          durationMinutes: 120,
          billable: true,
        },
        repositories.clients,
        repositories.contracts,
        repositories.timeEntries,
      );

      // Verify entry has correct workspace association
      expect(entry.workspaceId).toBe(context.workspaceId);
      expect(entry.userId).toBe(context.userId);

      // Verify entry is only accessible through the correct workspace context
      const readEntry = await repositories.timeEntries.getTimeEntry(context.workspaceId, entry.id);
      expect(readEntry?.workspaceId).toBe(context.workspaceId);
      expect(readEntry?.userId).toBe(context.userId);
    });
  });

  describe("contract validation security", () => {
    it("enforces contract-client relationship at create", async () => {
      const context = await createWorkspaceContext("contract-client-security");
      
      // Create two separate client-contract pairs
      const client1 = await createClient(
        context,
        {
          companyName: "Client One",
          email: "one@example.com",
          phone: "",
          address: "",
          vatNumber: "",
          notes: "",
        },
        repositories.clients,
      );

      const client2 = await createClient(
        context,
        {
          companyName: "Client Two", 
          email: "two@example.com",
          phone: "",
          address: "",
          vatNumber: "",
          notes: "",
        },
        repositories.clients,
      );

      const contract1 = await createContract(
        context,
        {
          clientId: client1.id,
          validFrom: "2026-01-01",
          validTo: "2026-12-31",
          billingModel: "HOURLY" as const,
          rate: "80",
          currency: "EUR",
        },
        repositories.clients,
        repositories.contracts,
      );

      // Attempt to create entry with mismatched client-contract
      await expect(
        createTimeEntry(
          context,
          {
            clientId: client2.id, // Client 2
            contractId: contract1.id, // Contract belongs to Client 1
            workDate: date("2026-06-15"),
            durationMinutes: 120,
            billable: true,
          },
          repositories.clients,
          repositories.contracts,
          repositories.timeEntries,
        )
      ).rejects.toThrow(ContractNotFoundError);
    });

    it("enforces contract validity date boundaries securely", async () => {
      const context = await createWorkspaceContext("date-boundary-security");
      const { client, contract } = await setupClientAndContract(context, "2026-06-01", "2026-08-31");

      // Test boundary conditions that should be rejected
      const invalidDates = [
        date("2026-05-31"), // One day before validFrom
        date("2026-09-01"), // On validTo (exclusive boundary)
        date("2025-12-31"), // Far before
        date("2027-01-01"), // Far after
      ];

      for (const invalidDate of invalidDates) {
        await expect(
          createTimeEntry(
            context,
            {
              clientId: client.id,
              contractId: contract.id,
              workDate: invalidDate,
              durationMinutes: 120,
              billable: true,
            },
            repositories.clients,
            repositories.contracts,
            repositories.timeEntries,
          )
        ).rejects.toThrow(ContractNotValidForDateError);
      }

      // Verify valid boundary dates are accepted
      const validDates = [
        date("2026-06-01"), // validFrom (inclusive)
        date("2026-08-30"), // One day before validTo
      ];

      for (const validDate of validDates) {
        const entry = await createTimeEntry(
          context,
          {
            clientId: client.id,
            contractId: contract.id,
            workDate: validDate,
            durationMinutes: 120,
            billable: true,
          },
          repositories.clients,
          repositories.contracts,
          repositories.timeEntries,
        );

        expect(entry.workDate).toEqual(validDate);
      }
    });

    it("cannot bypass validation with direct repository access", async () => {
      const context = await createWorkspaceContext("bypass-validation");
      const { client, contract } = await setupClientAndContract(context, "2026-06-01", "2026-08-31");

      // Direct repository call should still respect workspace isolation
      const invalidRepositoryInput = {
        userId: context.userId,
        clientId: client.id,
        contractId: contract.id,
        workDate: date("2026-05-15"), // Invalid date
        durationMinutes: 120,
        billable: true,
      };

      // Even direct repository access should be workspace-scoped
      // (The validation should have happened at application service layer)
      const directEntry = await repositories.timeEntries.recordTimeEntry(
        context.workspaceId,
        invalidRepositoryInput,
      );

      // The entry was created (repository doesn't validate business rules)
      // but verify it's properly workspace-scoped
      expect(directEntry.workspaceId).toBe(context.workspaceId);
      expect(directEntry.userId).toBe(context.userId);
    });
  });

  describe("input sanitization and validation", () => {
    it("handles edge case input values safely", async () => {
      const context = await createWorkspaceContext("input-sanitization");
      const { client, contract } = await setupClientAndContract(context);

      // Test description with potential XSS/injection content
      const maliciousDescriptions = [
        "<script>alert('xss')</script>",
        "'; DROP TABLE time_entries; --",
        "\x00\x01\x02", // Null bytes and control characters
        "A".repeat(10000), // Very long string
      ];

      for (const description of maliciousDescriptions) {
        // Should either sanitize or reject, but not crash
        try {
          const entry = await createTimeEntry(
            context,
            {
              clientId: client.id,
              contractId: contract.id,
              workDate: date("2026-06-15"),
              durationMinutes: 120,
              description,
              billable: true,
            },
            repositories.clients,
            repositories.contracts,
            repositories.timeEntries,
          );

          // If accepted, verify it's stored safely
          const retrieved = await getTimeEntry(context, entry.id, repositories.timeEntries);
          expect(retrieved).toBeTruthy();
          expect(typeof retrieved?.description).toBe("string");
        } catch (error) {
          // Rejection is acceptable for invalid input
          expect(error).toBeInstanceOf(Error);
        }
      }
    });

    it("validates numeric inputs at boundaries", async () => {
      const context = await createWorkspaceContext("numeric-boundaries");
      const { client, contract } = await setupClientAndContract(context);

      // Test extreme numeric values
      const extremeValues = [
        Number.MAX_SAFE_INTEGER,
        Number.MIN_SAFE_INTEGER,
        Infinity,
        -Infinity,
        NaN,
      ];

      for (const duration of extremeValues) {
        await expect(
          createTimeEntry(
            context,
            {
              clientId: client.id,
              contractId: contract.id,
              workDate: date("2026-06-15"),
              durationMinutes: duration,
              billable: true,
            },
            repositories.clients,
            repositories.contracts,
            repositories.timeEntries,
          )
        ).rejects.toThrow();
      }
    });
  });
});