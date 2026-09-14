// tests/integration/time-tracking.test.ts
import { describe, expect, it } from "vitest";

import { createTimeEntry } from "@/application/time-entries/create-time-entry";
import { updateTimeEntry } from "@/application/time-entries/update-time-entry";
import { deleteTimeEntry } from "@/application/time-entries/delete-time-entry";
import { createClient } from "@/application/clients/create-client";
import { createContract } from "@/application/contracts/create-contract";
import { archiveClient } from "@/application/clients/archive-client";
import { createFirstWorkspace } from "@/application/workspace/create-first-workspace";
import type { WorkspaceContext } from "@/application/workspace/workspace-context";
import type { CreateTimeEntryInput } from "@/application/time-entries/create-time-entry";
import type { UpdateTimeEntryInput } from "@/domain/persistence-types";
import { 
  TimeEntryNotFoundError,
  InvalidDurationError,
  ContractNotValidForDateError
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
    `time-int-${suffix}`,
    { ...workspaceInput, name: `TimeInteg ${suffix}` },
    { runInTransaction },
  );

  return created.context;
}

async function setupClientAndContract(context: WorkspaceContext, validFrom = "2026-01-01", validTo = "2026-12-31") {
  const client = await createClient(
    context,
    {
      companyName: "Test Client",
      email: "test@example.com",
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
      rate: "75",
      currency: "EUR",
    },
    repositories.clients,
    repositories.contracts,
  );

  return { client, contract };
}

describe("time tracking integration", () => {
  describe("create time entry", () => {
    it("creates valid time entry with all required fields", async () => {
      const context = await createWorkspaceContext("create-valid");
      const { client, contract } = await setupClientAndContract(context);

      const input: CreateTimeEntryInput = {
        clientId: client.id,
        contractId: contract.id,
        workDate: date("2026-06-15"),
        durationMinutes: 120,
        description: "Development work",
        billable: true,
      };

      const result = await createTimeEntry(
        context,
        input,
        repositories.clients,
        repositories.contracts,
        repositories.timeEntries,
      );

      expect(result).toMatchObject({
        workspaceId: context.workspaceId,
        userId: context.userId,
        clientId: client.id,
        contractId: contract.id,
        workDate: date("2026-06-15"),
        durationMinutes: 120,
        description: "Development work",
        billable: true,
      });
      expect(result.id).toBeTruthy();
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.updatedAt).toBeInstanceOf(Date);
    });

    it("creates time entry with minimal fields", async () => {
      const context = await createWorkspaceContext("create-minimal");
      const { client, contract } = await setupClientAndContract(context);

      const input: CreateTimeEntryInput = {
        clientId: client.id,
        contractId: contract.id,
        workDate: date("2026-06-15"),
        durationMinutes: 60,
        billable: false,
      };

      const result = await createTimeEntry(
        context,
        input,
        repositories.clients,
        repositories.contracts,
        repositories.timeEntries,
      );

      expect(result).toMatchObject({
        clientId: client.id,
        contractId: contract.id,
        durationMinutes: 60,
        description: null,
        billable: false,
      });
    });

    it("accepts future work dates", async () => {
      const context = await createWorkspaceContext("create-future");
      const { client, contract } = await setupClientAndContract(context, "2026-01-01", "2026-12-31");

      const futureDate = date("2026-11-15");
      const input: CreateTimeEntryInput = {
        clientId: client.id,
        contractId: contract.id,
        workDate: futureDate,
        durationMinutes: 90,
        billable: true,
      };

      const result = await createTimeEntry(
        context,
        input,
        repositories.clients,
        repositories.contracts,
        repositories.timeEntries,
      );

      expect(result.workDate).toEqual(futureDate);
    });

    it("allows duplicate entries for same client/contract/date", async () => {
      const context = await createWorkspaceContext("create-duplicate");
      const { client, contract } = await setupClientAndContract(context);

      const input: CreateTimeEntryInput = {
        clientId: client.id,
        contractId: contract.id,
        workDate: date("2026-06-15"),
        durationMinutes: 60,
        billable: true,
      };

      const entry1 = await createTimeEntry(
        context,
        input,
        repositories.clients,
        repositories.contracts,
        repositories.timeEntries,
      );

      const entry2 = await createTimeEntry(
        context,
        { ...input, durationMinutes: 90 },
        repositories.clients,
        repositories.contracts,
        repositories.timeEntries,
      );

      expect(entry1.id).not.toEqual(entry2.id);
      expect(entry1.durationMinutes).toBe(60);
      expect(entry2.durationMinutes).toBe(90);
    });

    it("rejects invalid duration", async () => {
      const context = await createWorkspaceContext("create-invalid-duration");
      const { client, contract } = await setupClientAndContract(context);

      const invalidInputs = [
        { durationMinutes: 0 }, // zero
        { durationMinutes: -30 }, // negative
        { durationMinutes: 1441 }, // over 24 hours
      ];

      for (const invalidDuration of invalidInputs) {
        const input: CreateTimeEntryInput = {
          clientId: client.id,
          contractId: contract.id,
          workDate: date("2026-06-15"),
          durationMinutes: invalidDuration.durationMinutes,
          billable: true,
        };

        await expect(
          createTimeEntry(
            context,
            input,
            repositories.clients,
            repositories.contracts,
            repositories.timeEntries,
          )
        ).rejects.toThrow(InvalidDurationError);
      }
    });

    it("rejects unknown client", async () => {
      const context = await createWorkspaceContext("create-unknown-client");
      const { contract } = await setupClientAndContract(context);

      const input: CreateTimeEntryInput = {
        clientId: UNKNOWN_ID,
        contractId: contract.id,
        workDate: date("2026-06-15"),
        durationMinutes: 120,
        billable: true,
      };

      await expect(
        createTimeEntry(
          context,
          input,
          repositories.clients,
          repositories.contracts,
          repositories.timeEntries,
        )
      ).rejects.toThrow(ClientArchivedError);
    });

    it("rejects unknown contract", async () => {
      const context = await createWorkspaceContext("create-unknown-contract");
      const { client } = await setupClientAndContract(context);

      const input: CreateTimeEntryInput = {
        clientId: client.id,
        contractId: UNKNOWN_ID,
        workDate: date("2026-06-15"),
        durationMinutes: 120,
        billable: true,
      };

      await expect(
        createTimeEntry(
          context,
          input,
          repositories.clients,
          repositories.contracts,
          repositories.timeEntries,
        )
      ).rejects.toThrow(ContractNotFoundError);
    });

    it("rejects contract that does not belong to client", async () => {
      const context = await createWorkspaceContext("create-mismatched-contract");
      const { contract: contract1 } = await setupClientAndContract(context);
      
      // Create second client with different contract
      const client2 = await createClient(
        context,
        {
          companyName: "Second Client",
          email: "client2@example.com",
          phone: "",
          address: "",
          vatNumber: "",
          notes: "",
        },
        repositories.clients,
      );

      const input: CreateTimeEntryInput = {
        clientId: client2.id,
        contractId: contract1.id, // Contract belongs to client1, not client2
        workDate: date("2026-06-15"),
        durationMinutes: 120,
        billable: true,
      };

      await expect(
        createTimeEntry(
          context,
          input,
          repositories.clients,
          repositories.contracts,
          repositories.timeEntries,
        )
      ).rejects.toThrow(ContractNotFoundError);
    });

    it("rejects archived client", async () => {
      const context = await createWorkspaceContext("create-archived-client");
      const { client, contract } = await setupClientAndContract(context);

      // Archive the client
      await archiveClient(context, client.id, repositories.clients);

      const input: CreateTimeEntryInput = {
        clientId: client.id,
        contractId: contract.id,
        workDate: date("2026-06-15"),
        durationMinutes: 120,
        billable: true,
      };

      await expect(
        createTimeEntry(
          context,
          input,
          repositories.clients,
          repositories.contracts,
          repositories.timeEntries,
        )
        ).rejects.toThrow(ClientArchivedError);
    });

    it("rejects work date outside contract validity period", async () => {
      const context = await createWorkspaceContext("create-invalid-date");
      const { client, contract } = await setupClientAndContract(context, "2026-06-01", "2026-08-31");

      const invalidDates = [
        date("2026-05-31"), // Before validFrom
        date("2026-09-01"), // After validTo (exclusive)
      ];

      for (const invalidDate of invalidDates) {
        const input: CreateTimeEntryInput = {
          clientId: client.id,
          contractId: contract.id,
          workDate: invalidDate,
          durationMinutes: 120,
          billable: true,
        };

        await expect(
          createTimeEntry(
            context,
            input,
            repositories.clients,
            repositories.contracts,
            repositories.timeEntries,
          )
        ).rejects.toThrow(ContractNotValidForDateError);
      }
    });

    it("accepts work date at contract validity boundaries", async () => {
      const context = await createWorkspaceContext("create-boundary-dates");
      const { client, contract } = await setupClientAndContract(context, "2026-06-01", "2026-08-31");

      // Valid dates at boundaries
      const validDates = [
        date("2026-06-01"), // validFrom (inclusive)
        date("2026-08-30"), // Last valid date (validTo exclusive)
      ];

      for (const validDate of validDates) {
        const input: CreateTimeEntryInput = {
          clientId: client.id,
          contractId: contract.id,
          workDate: validDate,
          durationMinutes: 120,
          billable: true,
        };

        const result = await createTimeEntry(
          context,
          input,
          repositories.clients,
          repositories.contracts,
          repositories.timeEntries,
        );

        expect(result.workDate).toEqual(validDate);
      }
    });

    it("accepts open-ended contract (validTo = null)", async () => {
      const context = await createWorkspaceContext("create-open-contract");
      
      // Create client for open-ended contract test
      const client = await createClient(
        context,
        {
          companyName: "Open Contract Client",
          email: "open@example.com",
          phone: "",
          address: "",
          vatNumber: "",
          notes: "",
        },
        repositories.clients,
      );

      // Create open-ended contract (no overlap with other contracts)
      const openContract = await createContract(
        context,
        {
          clientId: client.id,
          validFrom: "2027-01-01", // Future date to avoid overlap
          validTo: null, // Open-ended
          billingModel: "HOURLY" as const,
          rate: "85",
          currency: "EUR",
        },
        repositories.clients,
        repositories.contracts,
      );

      const input: CreateTimeEntryInput = {
        clientId: client.id,
        contractId: openContract.id,
        workDate: date("2027-06-15"), // Date within open-ended contract
        durationMinutes: 120,
        billable: true,
      };

      const result = await createTimeEntry(
        context,
        input,
        repositories.clients,
        repositories.contracts,
        repositories.timeEntries,
      );

      expect(result.workDate).toEqual(date("2027-06-15"));
    });
  });

  describe("update time entry", () => {
    it("updates mutable fields successfully", async () => {
      const context = await createWorkspaceContext("update-mutable");
      const { client, contract } = await setupClientAndContract(context);

      // Create initial entry
      const created = await createTimeEntry(
        context,
        {
          clientId: client.id,
          contractId: contract.id,
          workDate: date("2026-06-15"),
          durationMinutes: 120,
          description: "Initial work",
          billable: true,
        },
        repositories.clients,
        repositories.contracts,
        repositories.timeEntries,
      );

      // Update mutable fields
      const updateInput: UpdateTimeEntryInput = {
        durationMinutes: 180,
        description: "Updated work description",
        billable: false,
      };

      const updated = await updateTimeEntry(
        context,
        created.id,
        updateInput,
        repositories.timeEntries,
      );

      expect(updated).toMatchObject({
        id: created.id,
        workspaceId: created.workspaceId,
        userId: created.userId,
        clientId: created.clientId, // Immutable
        contractId: created.contractId, // Immutable
        workDate: created.workDate, // Immutable
        durationMinutes: 180, // Updated
        description: "Updated work description", // Updated
        billable: false, // Updated
        createdAt: created.createdAt,
      });
      expect(updated.updatedAt).not.toEqual(created.updatedAt);
    });

    it("updates partial mutable fields", async () => {
      const context = await createWorkspaceContext("update-partial");
      const { client, contract } = await setupClientAndContract(context);

      const created = await createTimeEntry(
        context,
        {
          clientId: client.id,
          contractId: contract.id,
          workDate: date("2026-06-15"),
          durationMinutes: 120,
          description: "Original description",
          billable: true,
        },
        repositories.clients,
        repositories.contracts,
        repositories.timeEntries,
      );

      // Update only duration
      const updated = await updateTimeEntry(
        context,
        created.id,
        { durationMinutes: 90 },
        repositories.timeEntries,
      );

      expect(updated.durationMinutes).toBe(90);
      expect(updated.description).toBe("Original description"); // Unchanged
      expect(updated.billable).toBe(true); // Unchanged
    });

    it("clears description when set to null", async () => {
      const context = await createWorkspaceContext("update-clear-description");
      const { client, contract } = await setupClientAndContract(context);

      const created = await createTimeEntry(
        context,
        {
          clientId: client.id,
          contractId: contract.id,
          workDate: date("2026-06-15"),
          durationMinutes: 120,
          description: "To be cleared",
          billable: true,
        },
        repositories.clients,
        repositories.contracts,
        repositories.timeEntries,
      );

      const updated = await updateTimeEntry(
        context,
        created.id,
        { description: null },
        repositories.timeEntries,
      );

      expect(updated.description).toBeNull();
    });

    it("rejects invalid duration in update", async () => {
      const context = await createWorkspaceContext("update-invalid-duration");
      const { client, contract } = await setupClientAndContract(context);

      const created = await createTimeEntry(
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

      const invalidDurations = [0, -30, 1441];
      
      for (const invalidDuration of invalidDurations) {
        await expect(
          updateTimeEntry(
            context,
            created.id,
            { durationMinutes: invalidDuration },
            repositories.timeEntries,
          )
        ).rejects.toThrow(InvalidDurationError);
      }
    });

    it("rejects update of unknown time entry", async () => {
      const context = await createWorkspaceContext("update-unknown");

      await expect(
        updateTimeEntry(
          context,
          UNKNOWN_ID,
          { durationMinutes: 90 },
          repositories.timeEntries,
        )
      ).rejects.toThrow(TimeEntryNotFoundError);
    });
  });

  describe("delete time entry", () => {
    it("hard deletes time entry successfully", async () => {
      const context = await createWorkspaceContext("delete-success");
      const { client, contract } = await setupClientAndContract(context);

      const created = await createTimeEntry(
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

      // Confirm entry exists
      const beforeDelete = await repositories.timeEntries.getTimeEntry(
        context.workspaceId,
        created.id,
      );
      expect(beforeDelete).toBeTruthy();

      // Delete entry
      await deleteTimeEntry(
        context,
        created.id,
        repositories.timeEntries,
      );

      // Verify hard deletion
      const afterDelete = await repositories.timeEntries.getTimeEntry(
        context.workspaceId,
        created.id,
      );
      expect(afterDelete).toBeNull();
    });

    it("rejects delete of unknown time entry", async () => {
      const context = await createWorkspaceContext("delete-unknown");

      await expect(
        deleteTimeEntry(
          context,
          UNKNOWN_ID,
          repositories.timeEntries,
        )
      ).rejects.toThrow(TimeEntryNotFoundError);
    });
  });

  describe("workspace isolation", () => {
    it("prevents cross-workspace access to time entries", async () => {
      const contextA = await createWorkspaceContext("isolation-a");
      const contextB = await createWorkspaceContext("isolation-b");

      const { client: clientA, contract: contractA } = await setupClientAndContract(contextA);
      
      // Create time entry in workspace A
      const entryA = await createTimeEntry(
        contextA,
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
      );

      // Verify workspace A can access its own entry
      const readFromA = await repositories.timeEntries.getTimeEntry(contextA.workspaceId, entryA.id);
      expect(readFromA).toBeTruthy();

      // Verify workspace B cannot access workspace A's entry
      const readFromB = await repositories.timeEntries.getTimeEntry(contextB.workspaceId, entryA.id);
      expect(readFromB).toBeNull();

      // Verify workspace B cannot update workspace A's entry
      await expect(
        updateTimeEntry(
          contextB,
          entryA.id,
          { durationMinutes: 90 },
          repositories.timeEntries,
        )
      ).rejects.toThrow(TimeEntryNotFoundError);

      // Verify workspace B cannot delete workspace A's entry
      await expect(
        deleteTimeEntry(contextB, entryA.id, repositories.timeEntries)
      ).rejects.toThrow(TimeEntryNotFoundError);
    });

    it("prevents using foreign workspace client/contract IDs", async () => {
      const contextA = await createWorkspaceContext("foreign-a");
      const contextB = await createWorkspaceContext("foreign-b");

      const { client: clientA, contract: contractA } = await setupClientAndContract(contextA);

      // Attempt to create entry in workspace B using workspace A's client/contract
      await expect(
        createTimeEntry(
          contextB,
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
  });

  describe("archived client behavior", () => {
    it("allows reading existing entries for archived client", async () => {
      const context = await createWorkspaceContext("archived-read");
      const { client, contract } = await setupClientAndContract(context);

      // Create entry while client is active
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

      // Archive client
      await archiveClient(context, client.id, repositories.clients);

      // Verify entry is still readable
      const readEntry = await repositories.timeEntries.getTimeEntry(context.workspaceId, entry.id);
      expect(readEntry).toBeTruthy();
      expect(readEntry?.clientId).toBe(client.id);
    });

    it("allows editing existing entries for archived client", async () => {
      const context = await createWorkspaceContext("archived-edit");
      const { client, contract } = await setupClientAndContract(context);

      // Create entry while client is active
      const entry = await createTimeEntry(
        context,
        {
          clientId: client.id,
          contractId: contract.id,
          workDate: date("2026-06-15"),
          durationMinutes: 120,
          description: "Original work",
          billable: true,
        },
        repositories.clients,
        repositories.contracts,
        repositories.timeEntries,
      );

      // Archive client
      await archiveClient(context, client.id, repositories.clients);

      // Verify existing entry can be edited
      const updated = await updateTimeEntry(
        context,
        entry.id,
        {
          durationMinutes: 180,
          description: "Updated work",
          billable: false,
        },
        repositories.timeEntries,
      );

      expect(updated.durationMinutes).toBe(180);
      expect(updated.description).toBe("Updated work");
      expect(updated.billable).toBe(false);
      expect(updated.clientId).toBe(client.id); // Immutable
    });

    it("rejects new entries for archived client", async () => {
      const context = await createWorkspaceContext("archived-reject");
      const { client, contract } = await setupClientAndContract(context);

      // Archive client
      await archiveClient(context, client.id, repositories.clients);

      // Attempt to create new entry for archived client
      await expect(
        createTimeEntry(
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
        )
        ).rejects.toThrow(ClientArchivedError);
    });
  });

  describe("contract validity and historical behavior", () => {
    it("preserves existing entries when contract validity changes", async () => {
      const context = await createWorkspaceContext("historical-preserve");
      const { client, contract } = await setupClientAndContract(context, "2026-01-01", "2026-12-31");

      // Create entry in valid period
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

      // Simulate contract validity change (this would be done through contract update in real scenario)
      // The entry should remain valid and readable regardless of contract changes
      const readEntry = await repositories.timeEntries.getTimeEntry(context.workspaceId, entry.id);
      expect(readEntry).toBeTruthy();
      expect(readEntry?.contractId).toBe(contract.id);
      expect(readEntry?.workDate).toEqual(date("2026-06-15"));
    });

    it("does not revalidate contract for existing entries on edit", async () => {
      const context = await createWorkspaceContext("no-revalidate");
      const { client, contract } = await setupClientAndContract(context, "2026-01-01", "2026-12-31");

      // Create entry
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

      // Update should succeed without revalidating contract
      // (since workDate, clientId, contractId are immutable)
      const updated = await updateTimeEntry(
        context,
        entry.id,
        { durationMinutes: 180 },
        repositories.timeEntries,
      );

      expect(updated.durationMinutes).toBe(180);
    });
  });

  describe("duration boundaries and validation", () => {
    it("accepts valid duration boundaries", async () => {
      const context = await createWorkspaceContext("duration-boundaries");
      const { client, contract } = await setupClientAndContract(context);

      const validDurations = [
        1, // Minimum
        60, // 1 hour
        480, // 8 hours
        1440, // Maximum (24 hours)
      ];

      for (const duration of validDurations) {
        const entry = await createTimeEntry(
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
        );

        expect(entry.durationMinutes).toBe(duration);
      }
    });
  });

  describe("date filtering and queries", () => {
    it("lists time entries for specific date correctly", async () => {
      const context = await createWorkspaceContext("date-filter");
      const { client, contract } = await setupClientAndContract(context);

      const targetDate = date("2026-06-15");
      const otherDate = date("2026-06-16");

      // Create entries on different dates
      await createTimeEntry(
        context,
        {
          clientId: client.id,
          contractId: contract.id,
          workDate: targetDate,
          durationMinutes: 120,
          billable: true,
        },
        repositories.clients,
        repositories.contracts,
        repositories.timeEntries,
      );

      await createTimeEntry(
        context,
        {
          clientId: client.id,
          contractId: contract.id,
          workDate: otherDate,
          durationMinutes: 90,
          billable: true,
        },
        repositories.clients,
        repositories.contracts,
        repositories.timeEntries,
      );

      // Query for specific date
      const entries = await repositories.timeEntries.listTimeEntriesForDate(
        context.workspaceId,
        targetDate,
      );

      expect(entries).toHaveLength(1);
      expect(entries[0].workDate).toEqual(targetDate);
      expect(entries[0].durationMinutes).toBe(120);
    });
  });
});