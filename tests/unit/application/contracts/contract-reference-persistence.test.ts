// tests/unit/application/contracts/contract-reference-persistence.test.ts
import { describe, expect, it } from "vitest";

import { createContract } from "@/application/contracts/create-contract";
import { updateContract } from "@/application/contracts/update-contract";
import type { WorkspaceContext } from "@/application/workspace/workspace-context";
import type { ClientRecord, ContractRecord } from "@/domain/persistence-types";

const context: WorkspaceContext = {
  workspaceId: "workspace-1",
  userId: "user-1",
  role: "OWNER",
  timezone: "UTC",
};

function calendarDate(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

function clientRecord(): ClientRecord {
  return {
    id: "client-1",
    workspaceId: "workspace-1",
    companyName: "Test Client",
    vatNumber: null,
    taxCode: null,
    address: null,
    contactName: null,
    email: null,
    phone: null,
    notes: null,
    status: "ACTIVE",
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

describe("Contract reference persistence", () => {
  describe("createContract with reference", () => {
    it("persists non-empty reference", async () => {
      let capturedInput: any = null;

      const fakeClients = {
        getClient: async () => clientRecord(),
      };

      const fakeContracts = {
        createContract: async (_workspaceId: string, input: any) => {
          capturedInput = input;
          return {
            id: "contract-1",
            workspaceId: "workspace-1",
            clientId: "client-1",
            reference: input.reference,
            validFrom: input.validFrom,
            validTo: input.validTo,
            billingModel: input.billingModel,
            rate: input.rate,
            currency: input.currency,
            commitmentMode: input.commitmentMode,
            commitmentPercentage: input.commitmentPercentage,
            allocatedMinutes: input.allocatedMinutes,
            paymentTermsDays: input.paymentTermsDays,
            paymentTermsNote: input.paymentTermsNote,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
        },
        listContractsForClient: async () => [],
      };

      const result = await createContract(
        context,
        {
          clientId: "client-1",
          reference: "Progetto Web 2026",
          validFrom: "2026-01-01",
          validTo: "2026-12-31",
          billingModel: "HOURLY",
          rate: "100",
          currency: "EUR",
          commitmentMode: "PERCENTAGE",
          commitmentValue: "80",
          paymentTermsDays: "30",
        },
        fakeClients as any,
        fakeContracts as any,
      );

      expect(capturedInput.reference).toBe("Progetto Web 2026");
      expect(result.reference).toBe("Progetto Web 2026");
    });

    it("persists null when reference is empty string", async () => {
      let capturedInput: any = null;

      const fakeClients = {
        getClient: async () => clientRecord(),
      };

      const fakeContracts = {
        createContract: async (_workspaceId: string, input: any) => {
          capturedInput = input;
          return {
            id: "contract-1",
            workspaceId: "workspace-1",
            clientId: "client-1",
            reference: input.reference,
            validFrom: input.validFrom,
            validTo: input.validTo,
            billingModel: input.billingModel,
            rate: input.rate,
            currency: input.currency,
            commitmentMode: input.commitmentMode,
            commitmentPercentage: input.commitmentPercentage,
            allocatedMinutes: input.allocatedMinutes,
            paymentTermsDays: input.paymentTermsDays,
            paymentTermsNote: input.paymentTermsNote,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
        },
        listContractsForClient: async () => [],
      };

      await createContract(
        context,
        {
          clientId: "client-1",
          reference: "",
          validFrom: "2026-01-01",
          validTo: "2026-12-31",
          billingModel: "HOURLY",
          rate: "100",
          currency: "EUR",
          commitmentMode: "PERCENTAGE",
          commitmentValue: "80",
          paymentTermsDays: "30",
        },
        fakeClients as any,
        fakeContracts as any,
      );

      expect(capturedInput.reference).toBeNull();
    });

    it("persists null when reference is whitespace only", async () => {
      let capturedInput: any = null;

      const fakeClients = {
        getClient: async () => clientRecord(),
      };

      const fakeContracts = {
        createContract: async (_workspaceId: string, input: any) => {
          capturedInput = input;
          return {
            id: "contract-1",
            workspaceId: "workspace-1",
            clientId: "client-1",
            reference: input.reference,
            validFrom: input.validFrom,
            validTo: input.validTo,
            billingModel: input.billingModel,
            rate: input.rate,
            currency: input.currency,
            commitmentMode: input.commitmentMode,
            commitmentPercentage: input.commitmentPercentage,
            allocatedMinutes: input.allocatedMinutes,
            paymentTermsDays: input.paymentTermsDays,
            paymentTermsNote: input.paymentTermsNote,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
        },
        listContractsForClient: async () => [],
      };

      await createContract(
        context,
        {
          clientId: "client-1",
          reference: "   ",
          validFrom: "2026-01-01",
          validTo: "2026-12-31",
          billingModel: "HOURLY",
          rate: "100",
          currency: "EUR",
          commitmentMode: "PERCENTAGE",
          commitmentValue: "80",
          paymentTermsDays: "30",
        },
        fakeClients as any,
        fakeContracts as any,
      );

      expect(capturedInput.reference).toBeNull();
    });
  });

  describe("updateContract with reference", () => {
    it("updates reference value", async () => {
      let capturedInput: any = null;

      const fakeRepositories = {
        contracts: {
          lockContract: async () => ({
            id: "contract-1",
            workspaceId: "workspace-1",
            clientId: "client-1",
            reference: "Old Reference",
            validFrom: calendarDate("2026-01-01"),
            validTo: calendarDate("2026-12-31"),
            billingModel: "HOURLY" as const,
            rate: "100.0000",
            currency: "EUR",
            commitmentMode: "PERCENTAGE" as const,
            commitmentPercentage: 80,
            allocatedMinutes: null,
            paymentTermsDays: 30,
            paymentTermsNote: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          }),
          updateContract: async (_workspaceId: string, _contractId: string, input: any) => {
            capturedInput = input;
            return {
              id: "contract-1",
              workspaceId: "workspace-1",
              clientId: "client-1",
              reference: input.reference,
              validFrom: input.validFrom,
              validTo: input.validTo,
              billingModel: input.billingModel,
              rate: input.rate,
              currency: input.currency,
              commitmentMode: input.commitmentMode,
              commitmentPercentage: input.commitmentPercentage,
              allocatedMinutes: input.allocatedMinutes,
              paymentTermsDays: input.paymentTermsDays,
              paymentTermsNote: input.paymentTermsNote,
              createdAt: new Date(),
              updatedAt: new Date(),
            };
          },
          listContractsForClient: async () => [],
        },
        clients: {
          getClient: async () => clientRecord(),
        },
        invoices: {
          countInvoicesForContract: async () => 0,
        },
      };

      const runInTransaction = async (fn: any) => fn(fakeRepositories);

      await updateContract(
        context,
        "contract-1",
        {
          reference: "New Reference 2026",
          validFrom: "2026-01-01",
          validTo: "2026-12-31",
          billingModel: "HOURLY",
          rate: "100",
          currency: "EUR",
          commitmentMode: "PERCENTAGE",
          commitmentValue: "80",
          paymentTermsDays: "30",
        },
        runInTransaction as any,
      );

      expect(capturedInput.reference).toBe("New Reference 2026");
    });

    it("clears reference when empty string provided", async () => {
      let capturedInput: any = null;

      const fakeRepositories = {
        contracts: {
          lockContract: async () => ({
            id: "contract-1",
            workspaceId: "workspace-1",
            clientId: "client-1",
            reference: "Existing Reference",
            validFrom: calendarDate("2026-01-01"),
            validTo: calendarDate("2026-12-31"),
            billingModel: "HOURLY" as const,
            rate: "100.0000",
            currency: "EUR",
            commitmentMode: "PERCENTAGE" as const,
            commitmentPercentage: 80,
            allocatedMinutes: null,
            paymentTermsDays: 30,
            paymentTermsNote: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          }),
          updateContract: async (_workspaceId: string, _contractId: string, input: any) => {
            capturedInput = input;
            return {
              id: "contract-1",
              workspaceId: "workspace-1",
              clientId: "client-1",
              reference: input.reference,
              validFrom: input.validFrom,
              validTo: input.validTo,
              billingModel: input.billingModel,
              rate: input.rate,
              currency: input.currency,
              commitmentMode: input.commitmentMode,
              commitmentPercentage: input.commitmentPercentage,
              allocatedMinutes: input.allocatedMinutes,
              paymentTermsDays: input.paymentTermsDays,
              paymentTermsNote: input.paymentTermsNote,
              createdAt: new Date(),
              updatedAt: new Date(),
            };
          },
          listContractsForClient: async () => [],
        },
        clients: {
          getClient: async () => clientRecord(),
        },
        invoices: {
          countInvoicesForContract: async () => 0,
        },
      };

      const runInTransaction = async (fn: any) => fn(fakeRepositories);

      await updateContract(
        context,
        "contract-1",
        {
          reference: "",
          validFrom: "2026-01-01",
          validTo: "2026-12-31",
          billingModel: "HOURLY",
          rate: "100",
          currency: "EUR",
          commitmentMode: "PERCENTAGE",
          commitmentValue: "80",
          paymentTermsDays: "30",
        },
        runInTransaction as any,
      );

      expect(capturedInput.reference).toBeNull();
    });
  });
});
