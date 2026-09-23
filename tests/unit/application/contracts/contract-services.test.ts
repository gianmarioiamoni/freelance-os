// tests/unit/application/contracts/contract-services.test.ts
import { describe, expect, it } from "vitest";

import { createContract } from "@/application/contracts/create-contract";
import { getContract } from "@/application/contracts/get-contract";
import { getContractCoveringDate } from "@/application/contracts/get-contract-covering-date";
import { listContracts } from "@/application/contracts/list-contracts";
import { listContractsForClient } from "@/application/contracts/list-contracts-for-client";
import { updateContract } from "@/application/contracts/update-contract";
import type { WorkspaceContext } from "@/application/workspace/workspace-context";
import { ClientNotFoundError } from "@/domain/client-errors";
import {
  ClientArchivedError,
  ContractCurrencyImmutableError,
  ContractNotFoundError,
  OverlappingContractError,
} from "@/domain/contract-errors";
import {
  ConstraintViolationError,
  RecordNotFoundError,
} from "@/domain/persistence-errors";
import type {
  ClientRecord,
  ContractRecord,
  CreateClientInput,
  CreateContractInput,
  InvoiceRecord,
  UpdateContractInput,
} from "@/domain/persistence-types";
import type {
  ClientRepository,
  ContractRepository,
  InvoiceRepository,
  PersistenceRepositories,
  RunInTransaction,
} from "@/domain/repositories";

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
    createdAt: calendarDate("2026-01-01"),
    updatedAt: calendarDate("2026-01-01"),
    ...overrides,
  };
}

function contractRecord(overrides: Partial<ContractRecord> = {}): ContractRecord {
  return {
    id: "contract-1",
    workspaceId: context.workspaceId,
    clientId: "client-1",
    validFrom: calendarDate("2026-01-01"),
    validTo: calendarDate("2026-07-01"),
    billingModel: "HOURLY",
    rate: "80.0000",
    currency: "EUR",
    monthlyContractedMinutes: null,
    allocatedMinutes: null,
    paymentTermsDays: null,
    paymentTermsNote: null,
    createdAt: calendarDate("2026-01-01"),
    updatedAt: calendarDate("2026-01-01"),
    ...overrides,
  };
}

const validCreateInput = {
  clientId: "client-1",
  validFrom: "2026-01-01",
  validTo: "2026-07-01",
  billingModel: "HOURLY",
  rate: "80",
  currency: "EUR",
};

const validUpdateInput = {
  validFrom: "2026-01-01",
  validTo: "2026-08-01",
  billingModel: "DAILY",
  rate: "500",
  currency: "USD",
};

function invoiceRecord(overrides: Partial<InvoiceRecord> = {}): InvoiceRecord {
  return {
    id: "invoice-1",
    workspaceId: context.workspaceId,
    contractId: "contract-1",
    invoiceDate: calendarDate("2026-09-01"),
    amount: "1500.0000",
    currency: "EUR",
    reference: null,
    paymentTermsDays: 30,
    dueDate: calendarDate("2026-10-01"),
    voidedAt: null,
    createdAt: calendarDate("2026-09-01"),
    updatedAt: calendarDate("2026-09-01"),
    ...overrides,
  };
}

function createFakeRepositories(
  seedClients: ClientRecord[] = [],
  seedContracts: ContractRecord[] = [],
  seedInvoices: InvoiceRecord[] = [],
) {
  const clients = [...seedClients];
  const contracts = [...seedContracts];
  const invoices = [...seedInvoices];
  const calls: {
    getClient?: { workspaceId: string; clientId: string };
    create?: { workspaceId: string; input: CreateContractInput };
    get?: { workspaceId: string; contractId: string };
    list?: { workspaceId: string };
    listForClient?: { workspaceId: string; clientId: string };
    update?: { workspaceId: string; contractId: string; input: UpdateContractInput };
    covering?: { workspaceId: string; clientId: string; date: Date };
    existsForContract?: { workspaceId: string; contractId: string };
  } = {};

  const clientRepository: ClientRepository = {
    async createClient(workspaceId, input: CreateClientInput) {
      const record = clientRecord({
        id: `client-${clients.length + 1}`,
        workspaceId,
        companyName: input.companyName,
      });
      clients.push(record);
      return record;
    },
    async getClient(workspaceId, clientId) {
      calls.getClient = { workspaceId, clientId };
      return (
        clients.find(
          (row) => row.id === clientId && row.workspaceId === workspaceId,
        ) ?? null
      );
    },
    async listClients() {
      return clients;
    },
    async updateClient() {
      throw new Error("not used");
    },
    async archiveClient() {
      throw new Error("not used");
    },
  };

  const contractRepository: ContractRepository = {
    async createContract(workspaceId, input) {
      calls.create = { workspaceId, input };
      const record = contractRecord({
        id: `contract-${contracts.length + 1}`,
        workspaceId,
        clientId: input.clientId,
        validFrom: input.validFrom,
        validTo: input.validTo ?? null,
        billingModel: input.billingModel,
        rate: input.rate,
        currency: input.currency,
        monthlyContractedMinutes: input.monthlyContractedMinutes ?? null,
        allocatedMinutes: input.allocatedMinutes ?? null,
        paymentTermsDays: input.paymentTermsDays ?? null,
        paymentTermsNote: input.paymentTermsNote ?? null,
      });
      contracts.push(record);
      return record;
    },
    async getContract(workspaceId, contractId) {
      calls.get = { workspaceId, contractId };
      return (
        contracts.find(
          (row) => row.id === contractId && row.workspaceId === workspaceId,
        ) ?? null
      );
    },
    async listContracts(workspaceId) {
      calls.list = { workspaceId };
      return contracts.filter((row) => row.workspaceId === workspaceId);
    },
    async listContractsForClient(workspaceId, clientId) {
      calls.listForClient = { workspaceId, clientId };
      return contracts.filter(
        (row) => row.workspaceId === workspaceId && row.clientId === clientId,
      );
    },
    async updateContract(workspaceId, contractId, input) {
      calls.update = { workspaceId, contractId, input };
      const index = contracts.findIndex(
        (row) => row.id === contractId && row.workspaceId === workspaceId,
      );

      if (index === -1) {
        throw new RecordNotFoundError("Contract", contractId);
      }

      const current = contracts[index];
      const updated = contractRecord({
        ...current,
        validFrom: input.validFrom,
        validTo: input.validTo ?? null,
        billingModel: input.billingModel,
        rate: input.rate,
        currency: input.currency,
        monthlyContractedMinutes: input.monthlyContractedMinutes ?? null,
        allocatedMinutes: input.allocatedMinutes ?? null,
        paymentTermsDays: input.paymentTermsDays ?? null,
        paymentTermsNote: input.paymentTermsNote ?? null,
        workspaceId: current.workspaceId,
        clientId: current.clientId,
      });
      contracts[index] = updated;
      return updated;
    },
    async findContractCoveringDate(workspaceId, clientId, date) {
      calls.covering = { workspaceId, clientId, date };
      return (
        contracts.find(
          (row) =>
            row.workspaceId === workspaceId &&
            row.clientId === clientId &&
            row.validFrom.getTime() <= date.getTime() &&
            (row.validTo === null || date.getTime() < row.validTo.getTime()),
        ) ?? null
      );
    },
    async lockContract(workspaceId, contractId) {
      return contractRepository.getContract(workspaceId, contractId);
    },
  };

  const invoiceRepository: InvoiceRepository = {
    async createInvoice() {
      throw new Error("not used");
    },
    async getInvoice() {
      return null;
    },
    async lockInvoice() {
      return null;
    },
    async listInvoicesForContract() {
      return [];
    },
    async updateInvoice() {
      throw new Error("not used");
    },
    async voidInvoice() {
      throw new Error("not used");
    },
    async existsForContract(workspaceId, contractId) {
      calls.existsForContract = { workspaceId, contractId };
      return invoices.some(
        (row) => row.workspaceId === workspaceId && row.contractId === contractId,
      );
    },
  };

  return {
    clients,
    contracts,
    invoices,
    calls,
    clientRepository,
    contractRepository,
    invoiceRepository,
    runInTransaction: (async (work) =>
      work({
        clients: clientRepository,
        contracts: contractRepository,
        invoices: invoiceRepository,
      } as PersistenceRepositories)) as RunInTransaction,
  };
}

describe("contract application services", () => {
  it("creates a contract from trusted workspace context", async () => {
    const fake = createFakeRepositories([clientRecord()]);

    const created = await createContract(
      context,
      {
        ...validCreateInput,
        workspaceId: "workspace-from-form",
      } as typeof validCreateInput & { workspaceId: string },
      fake.clientRepository,
      fake.contractRepository,
    );

    expect(created.workspaceId).toBe("workspace-trusted");
    expect(created.clientId).toBe("client-1");
    expect(fake.calls.create).toMatchObject({
      workspaceId: "workspace-trusted",
      input: {
        clientId: "client-1",
        billingModel: "HOURLY",
        rate: "80",
        currency: "EUR",
      },
    });
    expect(fake.calls.create?.input).not.toHaveProperty("workspaceId");
    expect(fake.calls.getClient).toEqual({
      workspaceId: "workspace-trusted",
      clientId: "client-1",
    });
  });

  it("rejects create for an archived client", async () => {
    const fake = createFakeRepositories([clientRecord({ status: "ARCHIVED" })]);

    await expect(
      createContract(
        context,
        validCreateInput,
        fake.clientRepository,
        fake.contractRepository,
      ),
    ).rejects.toBeInstanceOf(ClientArchivedError);
    expect(fake.calls.create).toBeUndefined();
  });

  it("rejects create for a missing or foreign client", async () => {
    const fake = createFakeRepositories([
      clientRecord({ id: "client-foreign", workspaceId: "workspace-other" }),
    ]);

    await expect(
      createContract(
        context,
        validCreateInput,
        fake.clientRepository,
        fake.contractRepository,
      ),
    ).rejects.toBeInstanceOf(ClientNotFoundError);
    await expect(
      createContract(
        context,
        { ...validCreateInput, clientId: "client-foreign" },
        fake.clientRepository,
        fake.contractRepository,
      ),
    ).rejects.toBeInstanceOf(ClientNotFoundError);
  });

  it("rejects overlapping create in application code", async () => {
    const fake = createFakeRepositories(
      [clientRecord()],
      [contractRecord()],
    );

    await expect(
      createContract(
        context,
        {
          ...validCreateInput,
          validFrom: "2026-06-15",
          validTo: null,
        },
        fake.clientRepository,
        fake.contractRepository,
      ),
    ).rejects.toBeInstanceOf(OverlappingContractError);
  });

  it("maps a persistence constraint violation to the overlap error", async () => {
    const fake = createFakeRepositories([clientRecord()]);
    fake.contractRepository.createContract = async () => {
      throw new ConstraintViolationError();
    };

    await expect(
      createContract(
        context,
        validCreateInput,
        fake.clientRepository,
        fake.contractRepository,
      ),
    ).rejects.toBeInstanceOf(OverlappingContractError);
  });

  it("lists and gets contracts using workspaceId from WorkspaceContext", async () => {
    const fake = createFakeRepositories(
      [clientRecord()],
      [
        contractRecord(),
        contractRecord({
          id: "contract-foreign",
          workspaceId: "workspace-other",
        }),
      ],
    );

    const listed = await listContracts(context, fake.contractRepository);
    const found = await getContract(context, "contract-1", fake.contractRepository);

    expect(listed).toHaveLength(1);
    expect(listed[0]?.id).toBe("contract-1");
    expect(found.id).toBe("contract-1");
    expect(fake.calls.list).toEqual({ workspaceId: "workspace-trusted" });
    expect(fake.calls.get).toEqual({
      workspaceId: "workspace-trusted",
      contractId: "contract-1",
    });
  });

  it("lists contracts for a workspace client and treats a foreign client as not found", async () => {
    const fake = createFakeRepositories(
      [clientRecord()],
      [contractRecord()],
    );

    const listed = await listContractsForClient(
      context,
      "client-1",
      fake.clientRepository,
      fake.contractRepository,
    );

    expect(listed).toHaveLength(1);
    expect(fake.calls.listForClient).toEqual({
      workspaceId: "workspace-trusted",
      clientId: "client-1",
    });
    await expect(
      listContractsForClient(
        context,
        "missing",
        fake.clientRepository,
        fake.contractRepository,
      ),
    ).rejects.toBeInstanceOf(ClientNotFoundError);
  });

  it("updates allowed fields without changing workspace or client", async () => {
    const fake = createFakeRepositories([clientRecord()], [contractRecord()]);

    const updated = await updateContract(
      context,
      "contract-1",
      {
        ...validUpdateInput,
        clientId: "client-other",
      } as typeof validUpdateInput & { clientId: string },
      fake.runInTransaction,
    );

    expect(updated).toMatchObject({
      workspaceId: "workspace-trusted",
      clientId: "client-1",
      billingModel: "DAILY",
      rate: "500",
      currency: "USD",
    });
    expect(fake.calls.update).toMatchObject({
      workspaceId: "workspace-trusted",
      contractId: "contract-1",
    });
    expect(fake.calls.update?.input).not.toHaveProperty("clientId");
    expect(fake.calls.update?.input).not.toHaveProperty("workspaceId");
  });

  it("allows updating a contract whose client is archived", async () => {
    const fake = createFakeRepositories(
      [clientRecord({ status: "ARCHIVED" })],
      [contractRecord()],
    );

    const updated = await updateContract(
      context,
      "contract-1",
      validUpdateInput,
      fake.runInTransaction,
    );

    expect(updated.rate).toBe("500");
  });

  it("returns not found for unknown or foreign contracts", async () => {
    const fake = createFakeRepositories(
      [clientRecord()],
      [contractRecord({ id: "contract-foreign", workspaceId: "workspace-other" })],
    );

    await expect(
      getContract(context, "missing", fake.contractRepository),
    ).rejects.toBeInstanceOf(ContractNotFoundError);
    await expect(
      getContract(context, "contract-foreign", fake.contractRepository),
    ).rejects.toBeInstanceOf(ContractNotFoundError);
    await expect(
      updateContract(
        context,
        "missing",
        validUpdateInput,
        fake.runInTransaction,
      ),
    ).rejects.toBeInstanceOf(ContractNotFoundError);
    await expect(
      updateContract(
        context,
        "contract-foreign",
        validUpdateInput,
        fake.runInTransaction,
      ),
    ).rejects.toBeInstanceOf(ContractNotFoundError);
  });

  it("maps a persistence constraint violation on update to the overlap error", async () => {
    const fake = createFakeRepositories([clientRecord()], [contractRecord()]);
    fake.contractRepository.updateContract = async () => {
      throw new ConstraintViolationError();
    };

    await expect(
      updateContract(
        context,
        "contract-1",
        validUpdateInput,
        fake.runInTransaction,
      ),
    ).rejects.toBeInstanceOf(OverlappingContractError);
  });

  it("wraps covering-date lookup after client ownership check", async () => {
    const fake = createFakeRepositories([clientRecord()], [contractRecord()]);
    const date = calendarDate("2026-03-01");

    const covering = await getContractCoveringDate(
      context,
      "client-1",
      date,
      fake.clientRepository,
      fake.contractRepository,
    );

    expect(covering?.id).toBe("contract-1");
    expect(fake.calls.covering).toEqual({
      workspaceId: "workspace-trusted",
      clientId: "client-1",
      date,
    });
    await expect(
      getContractCoveringDate(
        context,
        "missing",
        date,
        fake.clientRepository,
        fake.contractRepository,
      ),
    ).rejects.toBeInstanceOf(ClientNotFoundError);
  });

  it("allows a currency change when the contract has no invoices", async () => {
    const fake = createFakeRepositories([clientRecord()], [contractRecord()]);

    const updated = await updateContract(
      context,
      "contract-1",
      validUpdateInput,
      fake.runInTransaction,
    );

    expect(updated.currency).toBe("USD");
    expect(fake.calls.existsForContract).toEqual({
      workspaceId: "workspace-trusted",
      contractId: "contract-1",
    });
  });

  it("rejects a currency change when an ACTIVE or VOID invoice exists", async () => {
    const active = createFakeRepositories(
      [clientRecord()],
      [contractRecord()],
      [invoiceRecord()],
    );
    const voided = createFakeRepositories(
      [clientRecord()],
      [contractRecord()],
      [invoiceRecord({ voidedAt: new Date("2026-09-22T10:00:00.000Z") })],
    );

    await expect(
      updateContract(
        context,
        "contract-1",
        validUpdateInput,
        active.runInTransaction,
      ),
    ).rejects.toBeInstanceOf(ContractCurrencyImmutableError);
    await expect(
      updateContract(
        context,
        "contract-1",
        validUpdateInput,
        voided.runInTransaction,
      ),
    ).rejects.toBeInstanceOf(ContractCurrencyImmutableError);
    expect(active.calls.update).toBeUndefined();
    expect(voided.calls.update).toBeUndefined();
  });

  it("does not let a cross-workspace invoice block an unrelated contract", async () => {
    const fake = createFakeRepositories(
      [clientRecord()],
      [contractRecord()],
      [
        invoiceRecord({
          workspaceId: "workspace-other",
          contractId: "contract-1",
        }),
      ],
    );

    const updated = await updateContract(
      context,
      "contract-1",
      validUpdateInput,
      fake.runInTransaction,
    );

    expect(updated.currency).toBe("USD");
    expect(fake.calls.existsForContract).toEqual({
      workspaceId: "workspace-trusted",
      contractId: "contract-1",
    });
  });

  it("allows a same-currency update when invoices exist", async () => {
    const fake = createFakeRepositories(
      [clientRecord()],
      [contractRecord()],
      [invoiceRecord()],
    );

    const updated = await updateContract(
      context,
      "contract-1",
      { ...validUpdateInput, currency: "EUR" },
      fake.runInTransaction,
    );

    expect(updated.currency).toBe("EUR");
    expect(updated.rate).toBe("500");
    expect(fake.calls.existsForContract).toBeUndefined();
  });
});
