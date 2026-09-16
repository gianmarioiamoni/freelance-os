// tests/unit/application/time-entries/time-entry-services.test.ts
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { describe, expect, it } from "vitest";

import { createTimeEntry } from "@/application/time-entries/create-time-entry";
import { getTimeEntry } from "@/application/time-entries/get-time-entry";
import { listTimeEntriesForDate, listTimeEntriesForPeriod } from "@/application/time-entries/list-time-entries";
import { updateTimeEntry } from "@/application/time-entries/update-time-entry";
import { deleteTimeEntry } from "@/application/time-entries/delete-time-entry";
import type { WorkspaceContext } from "@/application/workspace/workspace-context";
import { ClientArchivedError, ContractNotFoundError } from "@/domain/contract-errors";
import {
  InvalidDurationError,
  TimeEntryNotFoundError,
  ContractNotValidForDateError,
} from "@/domain/time-entry-errors";
import type {
  ClientRecord,
  ContractRecord,
  TimeEntryRecord,
  UpdateTimeEntryInput,
} from "@/domain/persistence-types";
import type { ClientRepository, ContractRepository, TimeEntryRepository } from "@/domain/repositories";

const context: WorkspaceContext = {
  workspaceId: "workspace-trusted",
  userId: "user-1",
  role: "OWNER",
  timezone: "UTC",
};

function calendarDate(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

function clientRecord(overrides: Partial<ClientRecord> = {}): ClientRecord {
  return {
    id: "client-1",
    workspaceId: context.workspaceId,
    companyName: "Acme Studio",
    vatNumber: null,
    taxCode: null,
    address: null,
    contactName: null,
    email: null,
    phone: null,
    notes: null,
    status: "ACTIVE",
    createdAt: new Date("2024-01-01T10:00:00.000Z"),
    updatedAt: new Date("2024-01-01T10:00:00.000Z"),
    ...overrides,
  };
}

function contractRecord(overrides: Partial<ContractRecord> = {}): ContractRecord {
  return {
    id: "contract-1",
    workspaceId: context.workspaceId,
    clientId: "client-1",
    validFrom: calendarDate("2024-01-01"),
    validTo: null, // Open-ended
    billingModel: "HOURLY",
    rate: "100.00",
    currency: "EUR",
    monthlyContractedMinutes: 9600, // 160 hours
    paymentTermsDays: 30,
    paymentTermsNote: null,
    createdAt: new Date("2024-01-01T10:00:00.000Z"),
    updatedAt: new Date("2024-01-01T10:00:00.000Z"),
    ...overrides,
  };
}

function timeEntryRecord(overrides: Partial<TimeEntryRecord> = {}): TimeEntryRecord {
  return {
    id: "time-entry-1",
    workspaceId: context.workspaceId,
    userId: context.userId,
    clientId: "client-1",
    contractId: "contract-1",
    workDate: calendarDate("2024-01-15"),
    durationMinutes: 120,
    description: "Development work",
    billable: true,
    createdAt: new Date("2024-01-15T10:00:00.000Z"),
    updatedAt: new Date("2024-01-15T10:00:00.000Z"),
    ...overrides,
  };
}

function mockRepositories() {
  return {
    clients: {} as ClientRepository,
    contracts: {} as ContractRepository,
    timeEntries: {} as TimeEntryRepository,
  };
}

describe("createTimeEntry", () => {
  it("creates valid time entry", async () => {
    const client = clientRecord();
    const contract = contractRecord();
    const expectedEntry = timeEntryRecord();

    const clients: ClientRepository = {
      getClient: async (workspaceId: string, clientId: string) => 
        workspaceId === context.workspaceId && clientId === client.id ? client : null,
    } as any;

    const contracts: ContractRepository = {
      getContract: async (workspaceId: string, contractId: string) =>
        workspaceId === context.workspaceId && contractId === contract.id ? contract : null,
    } as any;

    const timeEntries: TimeEntryRepository = {
      recordTimeEntry: async (workspaceId: string, input: any) => expectedEntry,
    } as any;

    const result = await createTimeEntry(
      context,
      {
        clientId: "client-1",
        contractId: "contract-1",
        workDate: calendarDate("2024-01-15"),
        durationMinutes: 120,
        description: "Development work",
        billable: true,
      },
      clients,
      contracts,
      timeEntries,
    );

    expect(result).toBe(expectedEntry);
  });

  it("rejects archived client", async () => {
    const client = clientRecord({ status: "ARCHIVED" });

    const clients: ClientRepository = {
      getClient: async (workspaceId: string, clientId: string) => 
        workspaceId === context.workspaceId && clientId === client.id ? client : null,
    } as any;

    const contracts: ContractRepository = {} as any;
    const timeEntries: TimeEntryRepository = {} as any;

    await expect(
      createTimeEntry(
        context,
        {
          clientId: "client-1",
          contractId: "contract-1",
          workDate: calendarDate("2024-01-15"),
          durationMinutes: 120,
          billable: true,
        },
        clients as ClientRepository,
        contracts as ContractRepository,
        timeEntries as TimeEntryRepository,
      ),
    ).rejects.toBeInstanceOf(ClientArchivedError);
  });

  it("rejects invalid contract for date", async () => {
    const client = clientRecord();
    const contract = contractRecord({
      validFrom: calendarDate("2024-02-01"), // Contract starts after work date
    });

    const clients: ClientRepository = {
      getClient: async (workspaceId: string, clientId: string) => 
        workspaceId === context.workspaceId && clientId === client.id ? client : null,
    } as any;

    const contracts: ContractRepository = {
      getContract: async (workspaceId: string, contractId: string) =>
        workspaceId === context.workspaceId && contractId === contract.id ? contract : null,
    } as any;

    const timeEntries: TimeEntryRepository = {} as any;

    await expect(
      createTimeEntry(
        context,
        {
          clientId: "client-1",
          contractId: "contract-1",
          workDate: calendarDate("2024-01-15"), // Before contract starts
          durationMinutes: 120,
          billable: true,
        },
        clients as ClientRepository,
        contracts as ContractRepository,
        timeEntries as TimeEntryRepository,
      ),
    ).rejects.toBeInstanceOf(ContractNotValidForDateError);
  });

  it("rejects invalid duration - zero", async () => {
    const clients: ClientRepository = {} as any;
    const contracts: ContractRepository = {} as any;
    const timeEntries: TimeEntryRepository = {} as any;

    await expect(
      createTimeEntry(
        context,
        {
          clientId: "client-1",
          contractId: "contract-1",
          workDate: calendarDate("2024-01-15"),
          durationMinutes: 0,
          billable: true,
        },
        clients as ClientRepository,
        contracts as ContractRepository,
        timeEntries as TimeEntryRepository,
      ),
    ).rejects.toBeInstanceOf(InvalidDurationError);
  });

  it("rejects invalid duration - over 24 hours", async () => {
    const clients: ClientRepository = {} as any;
    const contracts: ContractRepository = {} as any;
    const timeEntries: TimeEntryRepository = {} as any;

    await expect(
      createTimeEntry(
        context,
        {
          clientId: "client-1",
          contractId: "contract-1",
          workDate: calendarDate("2024-01-15"),
          durationMinutes: 1441, // > 24 hours
          billable: true,
        },
        clients as ClientRepository,
        contracts as ContractRepository,
        timeEntries as TimeEntryRepository,
      ),
    ).rejects.toBeInstanceOf(InvalidDurationError);
  });

  it("rejects non-existent client", async () => {
    const clients: ClientRepository = {
      getClient: async (_workspaceId: string, _clientId: string) => null,
    } as any;

    const contracts: ContractRepository = {} as any;
    const timeEntries: TimeEntryRepository = {} as any;

    await expect(
      createTimeEntry(
        context,
        {
          clientId: "client-999",
          contractId: "contract-1",
          workDate: calendarDate("2024-01-15"),
          durationMinutes: 120,
          billable: true,
        },
        clients as ClientRepository,
        contracts as ContractRepository,
        timeEntries as TimeEntryRepository,
      ),
    ).rejects.toBeInstanceOf(ClientArchivedError);
  });

  it("rejects contract that doesn't belong to client", async () => {
    const client = clientRecord();
    const contract = contractRecord({ clientId: "client-2" }); // Different client

    const clients: ClientRepository = {
      getClient: async (workspaceId: string, clientId: string) => 
        workspaceId === context.workspaceId && clientId === client.id ? client : null,
    } as any;

    const contracts: ContractRepository = {
      getContract: async (workspaceId: string, contractId: string) =>
        workspaceId === context.workspaceId && contractId === contract.id ? contract : null,
    } as any;

    const timeEntries: TimeEntryRepository = {} as any;

    await expect(
      createTimeEntry(
        context,
        {
          clientId: "client-1",
          contractId: "contract-1",
          workDate: calendarDate("2024-01-15"),
          durationMinutes: 120,
          billable: true,
        },
        clients as ClientRepository,
        contracts as ContractRepository,
        timeEntries as TimeEntryRepository,
      ),
    ).rejects.toBeInstanceOf(ContractNotFoundError);
  });
});

describe("getTimeEntry", () => {
  it("returns time entry when found", async () => {
    const entry = timeEntryRecord();

    const timeEntries: TimeEntryRepository = {
      getTimeEntry: async (workspaceId: string, timeEntryId: string) =>
        workspaceId === context.workspaceId && timeEntryId === entry.id ? entry : null,
    } as any;

    const result = await getTimeEntry(context, "time-entry-1", timeEntries);

    expect(result).toBe(entry);
  });

  it("throws TimeEntryNotFoundError when not found", async () => {
    const timeEntries: TimeEntryRepository = {
      getTimeEntry: async (_workspaceId: string, _timeEntryId: string) => null,
    } as any;

    await expect(
      getTimeEntry(context, "time-entry-999", timeEntries),
    ).rejects.toBeInstanceOf(TimeEntryNotFoundError);
  });
});

describe("updateTimeEntry", () => {
  it("updates time entry with valid input", async () => {
    const existingEntry = timeEntryRecord();
    const updatedEntry = timeEntryRecord({ durationMinutes: 180, description: "Updated work" });

    const timeEntries: TimeEntryRepository = {
      getTimeEntry: async (workspaceId: string, timeEntryId: string) =>
        workspaceId === context.workspaceId && timeEntryId === existingEntry.id ? existingEntry : null,
      updateTimeEntry: async (workspaceId: string, timeEntryId: string, input: any) => updatedEntry,
    } as any;

    const updateInput: UpdateTimeEntryInput = {
      durationMinutes: 180,
      description: "Updated work",
      billable: true,
    };

    const result = await updateTimeEntry(context, "time-entry-1", updateInput, timeEntries);

    expect(result).toBe(updatedEntry);
  });

  it("throws TimeEntryNotFoundError for non-existent entry", async () => {
    const timeEntries: TimeEntryRepository = {
      getTimeEntry: async (_workspaceId: string, _timeEntryId: string) => null,
    } as any;

    await expect(
      updateTimeEntry(context, "time-entry-999", { durationMinutes: 180 }, timeEntries),
    ).rejects.toBeInstanceOf(TimeEntryNotFoundError);
  });

  it("rejects invalid duration in update", async () => {
    const timeEntries: TimeEntryRepository = {} as any;

    await expect(
      updateTimeEntry(context, "time-entry-1", { durationMinutes: 0 }, timeEntries),
    ).rejects.toBeInstanceOf(InvalidDurationError);
  });
});

describe("deleteTimeEntry", () => {
  it("deletes time entry when found", async () => {
    const existingEntry = timeEntryRecord();
    let deleted = false;

    const timeEntries: TimeEntryRepository = {
      getTimeEntry: async (workspaceId: string, timeEntryId: string) =>
        workspaceId === context.workspaceId && timeEntryId === existingEntry.id ? existingEntry : null,
      deleteTimeEntry: async (workspaceId: string, timeEntryId: string) => {
        deleted = true;
      },
    } as any;

    await deleteTimeEntry(context, "time-entry-1", timeEntries);

    expect(deleted).toBe(true);
  });

  it("throws TimeEntryNotFoundError when not found", async () => {
    const timeEntries: TimeEntryRepository = {
      getTimeEntry: async (_workspaceId: string, _timeEntryId: string) => null,
    } as any;

    await expect(
      deleteTimeEntry(context, "time-entry-999", timeEntries),
    ).rejects.toBeInstanceOf(TimeEntryNotFoundError);
  });
});

describe("listTimeEntriesForDate", () => {
  it("returns time entries for date", async () => {
    const entries = [timeEntryRecord()];
    const workDate = calendarDate("2024-01-15");

    const timeEntries: TimeEntryRepository = {
      listTimeEntriesForDate: async (workspaceId: string, date: Date) =>
        workspaceId === context.workspaceId && date.getTime() === workDate.getTime() ? entries : [],
    } as any;

    const result = await listTimeEntriesForDate(context, workDate, timeEntries);

    expect(result).toBe(entries);
  });
});

describe("listTimeEntriesForPeriod", () => {
  it("returns time entries for period", async () => {
    const entries = [timeEntryRecord()];
    const startDate = calendarDate("2024-01-01");
    const endDate = calendarDate("2024-01-31");

    const timeEntries: TimeEntryRepository = {
      listTimeEntriesForPeriod: async (workspaceId: string, start: Date, end: Date) =>
        workspaceId === context.workspaceId ? entries : [],
    } as any;

    const result = await listTimeEntriesForPeriod(context, startDate, endDate, timeEntries);

    expect(result).toBe(entries);
  });
});