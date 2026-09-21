// tests/unit/features/time-entries/attach-time-entry-details.test.ts
import { describe, expect, it } from "vitest";

import {
  attachTimeEntryDetails,
  clientsSelectableForCreate,
} from "@/features/time-entries/attach-time-entry-details";
import type {
  ClientRecord,
  ContractRecord,
  TimeEntryRecord,
} from "@/domain/persistence-types";

const WORKSPACE_A = "workspace-a";
const WORKSPACE_B = "workspace-b";

function clientRecord(overrides: Partial<ClientRecord> = {}): ClientRecord {
  return {
    id: "client-1",
    workspaceId: WORKSPACE_A,
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
    workspaceId: WORKSPACE_A,
    clientId: "client-1",
    validFrom: new Date("2024-01-01T00:00:00.000Z"),
    validTo: null,
    billingModel: "HOURLY",
    rate: "100.00",
    currency: "EUR",
    monthlyContractedMinutes: 9600,
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
    workspaceId: WORKSPACE_A,
    userId: "user-1",
    clientId: "client-1",
    contractId: "contract-1",
    workDate: new Date("2024-01-15T00:00:00.000Z"),
    durationMinutes: 120,
    description: "Development work",
    billable: true,
    snapshotBillingModel: "HOURLY",
    snapshotRate: "100.0000",
    snapshotCurrency: "EUR",
    createdAt: new Date("2024-01-15T10:00:00.000Z"),
    updatedAt: new Date("2024-01-15T10:00:00.000Z"),
    ...overrides,
  };
}

describe("attachTimeEntryDetails — F-103-002", () => {
  it("keeps an active-client TimeEntry visible", () => {
    const client = clientRecord();
    const contract = contractRecord();
    const entry = timeEntryRecord();

    const result = attachTimeEntryDetails([entry], [client], [contract]);

    expect(result).toHaveLength(1);
    expect(result[0]?.client.id).toBe(client.id);
    expect(result[0]?.client.status).toBe("ACTIVE");
  });

  it("keeps an archived-client historical TimeEntry visible", () => {
    const client = clientRecord({ status: "ARCHIVED" });
    const contract = contractRecord();
    const entry = timeEntryRecord();

    const result = attachTimeEntryDetails([entry], [client], [contract]);

    expect(result).toHaveLength(1);
    expect(result[0]?.client.status).toBe("ARCHIVED");
    expect(result[0]?.id).toBe(entry.id);
  });

  it("drops an entry whose client is absent from the workspace list", () => {
    const foreignClient = clientRecord({
      id: "client-foreign",
      workspaceId: WORKSPACE_B,
    });
    const contract = contractRecord();
    const entry = timeEntryRecord({ clientId: "client-foreign" });

    const workspaceClients = [clientRecord()];
    const result = attachTimeEntryDetails([entry], workspaceClients, [contract]);

    expect(result).toHaveLength(0);
    expect(workspaceClients.some((client) => client.id === foreignClient.id)).toBe(
      false,
    );
  });
});

describe("clientsSelectableForCreate — F-103-002", () => {
  it("excludes archived clients from new TimeEntry selection", () => {
    const active = clientRecord({ id: "client-active" });
    const archived = clientRecord({ id: "client-archived", status: "ARCHIVED" });

    expect(clientsSelectableForCreate([active, archived])).toEqual([active]);
  });
});
