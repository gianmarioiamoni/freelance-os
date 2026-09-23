// tests/unit/application/time-entries/contract-validation.test.ts
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { describe, expect, it } from "vitest";

import {
  isContractValidForDate,
  validateContractForTimeEntry,
  getEligibleContracts,
} from "@/application/time-entries/contract-validation";
import type { WorkspaceContext } from "@/application/workspace/workspace-context";
import { ClientArchivedError, ContractNotFoundError } from "@/domain/contract-errors";
import { ContractNotValidForDateError } from "@/domain/time-entry-errors";
import type { ClientRecord, ContractRecord } from "@/domain/persistence-types";
import type { ClientRepository, ContractRepository } from "@/domain/repositories";

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
    allocatedMinutes: null,
    paymentTermsDays: 30,
    paymentTermsNote: null,
    createdAt: new Date("2024-01-01T10:00:00.000Z"),
    updatedAt: new Date("2024-01-01T10:00:00.000Z"),
    ...overrides,
  };
}

describe("isContractValidForDate", () => {
  it("returns true for open-ended contract after valid from", () => {
    const contract = contractRecord({
      validFrom: calendarDate("2024-01-01"),
      validTo: null,
    });

    expect(isContractValidForDate(contract, calendarDate("2024-01-01"))).toBe(true);
    expect(isContractValidForDate(contract, calendarDate("2024-01-15"))).toBe(true);
    expect(isContractValidForDate(contract, calendarDate("2024-12-31"))).toBe(true);
  });

  it("returns false for open-ended contract before valid from", () => {
    const contract = contractRecord({
      validFrom: calendarDate("2024-01-15"),
      validTo: null,
    });

    expect(isContractValidForDate(contract, calendarDate("2024-01-01"))).toBe(false);
    expect(isContractValidForDate(contract, calendarDate("2024-01-14"))).toBe(false);
  });

  it("returns true for finite contract within validity period", () => {
    const contract = contractRecord({
      validFrom: calendarDate("2024-01-01"),
      validTo: calendarDate("2024-01-31"),
    });

    expect(isContractValidForDate(contract, calendarDate("2024-01-01"))).toBe(true);
    expect(isContractValidForDate(contract, calendarDate("2024-01-15"))).toBe(true);
    expect(isContractValidForDate(contract, calendarDate("2024-01-30"))).toBe(true);
  });

  it("returns false for finite contract on validTo date (exclusive)", () => {
    const contract = contractRecord({
      validFrom: calendarDate("2024-01-01"),
      validTo: calendarDate("2024-01-31"),
    });

    expect(isContractValidForDate(contract, calendarDate("2024-01-31"))).toBe(false);
  });

  it("returns false for finite contract after validity period", () => {
    const contract = contractRecord({
      validFrom: calendarDate("2024-01-01"),
      validTo: calendarDate("2024-01-31"),
    });

    expect(isContractValidForDate(contract, calendarDate("2024-02-01"))).toBe(false);
    expect(isContractValidForDate(contract, calendarDate("2024-12-31"))).toBe(false);
  });

  it("returns false for finite contract before validity period", () => {
    const contract = contractRecord({
      validFrom: calendarDate("2024-01-15"),
      validTo: calendarDate("2024-01-31"),
    });

    expect(isContractValidForDate(contract, calendarDate("2024-01-01"))).toBe(false);
    expect(isContractValidForDate(contract, calendarDate("2024-01-14"))).toBe(false);
  });
});

describe("validateContractForTimeEntry", () => {
  it("validates contract for active client and valid date", async () => {
    const client = clientRecord();
    const contract = contractRecord();
    const workDate = calendarDate("2024-01-15");

    const clients: ClientRepository = {
      getClient: async (workspaceId: string, clientId: string) =>
        workspaceId === context.workspaceId && clientId === client.id ? client : null,
    } as any;

    const contracts: ContractRepository = {
      getContract: async (workspaceId: string, contractId: string) =>
        workspaceId === context.workspaceId && contractId === contract.id ? contract : null,
    } as any;

    const result = await validateContractForTimeEntry(
      context,
      "client-1",
      "contract-1",
      workDate,
      clients,
      contracts,
    );

    expect(result).toBe(contract);
  });

  it("throws ClientArchivedError for archived client", async () => {
    const client = clientRecord({ status: "ARCHIVED" });

    const clients: ClientRepository = {
      getClient: async (workspaceId: string, clientId: string) =>
        workspaceId === context.workspaceId && clientId === client.id ? client : null,
    } as any;

    const contracts: ContractRepository = {} as any;

    await expect(
      validateContractForTimeEntry(
        context,
        "client-1",
        "contract-1",
        calendarDate("2024-01-15"),
        clients,
        contracts,
      ),
    ).rejects.toBeInstanceOf(ClientArchivedError);
  });

  it("throws ClientArchivedError for non-existent client", async () => {
    const clients: ClientRepository = {
      getClient: async (_workspaceId: string, _clientId: string) => null,
    } as any;

    const contracts: ContractRepository = {} as any;

    await expect(
      validateContractForTimeEntry(
        context,
        "client-999",
        "contract-1",
        calendarDate("2024-01-15"),
        clients,
        contracts,
      ),
    ).rejects.toBeInstanceOf(ClientArchivedError);
  });

  it("throws ContractNotFoundError for non-existent contract", async () => {
    const client = clientRecord();

    const clients: ClientRepository = {
      getClient: async (workspaceId: string, clientId: string) =>
        workspaceId === context.workspaceId && clientId === client.id ? client : null,
    } as any;

    const contracts: ContractRepository = {
      getContract: async (_workspaceId: string, _contractId: string) => null,
    } as any;

    await expect(
      validateContractForTimeEntry(
        context,
        "client-1",
        "contract-999",
        calendarDate("2024-01-15"),
        clients,
        contracts,
      ),
    ).rejects.toBeInstanceOf(ContractNotFoundError);
  });

  it("throws ContractNotFoundError for contract not belonging to client", async () => {
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

    await expect(
      validateContractForTimeEntry(
        context,
        "client-1",
        "contract-1",
        calendarDate("2024-01-15"),
        clients,
        contracts,
      ),
    ).rejects.toBeInstanceOf(ContractNotFoundError);
  });

  it("throws ContractNotValidForDateError for contract not valid on date", async () => {
    const client = clientRecord();
    const contract = contractRecord({
      validFrom: calendarDate("2024-02-01"), // After work date
    });

    const clients: ClientRepository = {
      getClient: async (workspaceId: string, clientId: string) =>
        workspaceId === context.workspaceId && clientId === client.id ? client : null,
    } as any;

    const contracts: ContractRepository = {
      getContract: async (workspaceId: string, contractId: string) =>
        workspaceId === context.workspaceId && contractId === contract.id ? contract : null,
    } as any;

    await expect(
      validateContractForTimeEntry(
        context,
        "client-1",
        "contract-1",
        calendarDate("2024-01-15"), // Before contract starts
        clients,
        contracts,
      ),
    ).rejects.toBeInstanceOf(ContractNotValidForDateError);
  });
});

describe("getEligibleContracts", () => {
  it("returns contracts valid for work date", async () => {
    const validContract = contractRecord({
      id: "contract-1",
      validFrom: calendarDate("2024-01-01"),
      validTo: null,
    });

    const expiredContract = contractRecord({
      id: "contract-2",
      validFrom: calendarDate("2023-01-01"),
      validTo: calendarDate("2023-12-31"),
    });

    const futureContract = contractRecord({
      id: "contract-3",
      validFrom: calendarDate("2024-02-01"),
      validTo: null,
    });

    const contracts: ContractRepository = {
      listContractsForClient: async (workspaceId: string, clientId: string) =>
        workspaceId === context.workspaceId && clientId === "client-1"
          ? [validContract, expiredContract, futureContract]
          : [],
    } as any;

    const result = await getEligibleContracts(
      context,
      "client-1",
      calendarDate("2024-01-15"),
      contracts,
    );

    expect(result).toEqual([validContract]);
  });

  it("returns empty array when no contracts are eligible", async () => {
    const contracts: ContractRepository = {
      listContractsForClient: async (_workspaceId: string, _clientId: string) => [],
    } as any;

    const result = await getEligibleContracts(
      context,
      "client-1",
      calendarDate("2024-01-15"),
      contracts,
    );

    expect(result).toEqual([]);
  });
});