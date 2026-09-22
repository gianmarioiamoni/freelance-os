// tests/unit/application/invoices/invoice-services.test.ts
import { describe, expect, it } from "vitest";

import { createInvoice } from "@/application/invoices/create-invoice";
import { getInvoice } from "@/application/invoices/get-invoice";
import { listInvoicesForContract } from "@/application/invoices/list-invoices-for-contract";
import { updateInvoice } from "@/application/invoices/update-invoice";
import { voidInvoice } from "@/application/invoices/void-invoice";
import type { WorkspaceContext } from "@/application/workspace/workspace-context";
import { ContractNotFoundError } from "@/domain/contract-errors";
import {
  InvoiceAlreadyVoidedError,
  InvoiceNotEditableError,
  InvoiceNotFoundError,
  InvalidInvoiceInputError,
} from "@/domain/invoice-errors";
import { RecordNotFoundError } from "@/domain/persistence-errors";
import type {
  ContractRecord,
  CreateInvoiceInput,
  InvoiceRecord,
  InvoiceTrackingFilter,
  UpdateInvoiceInput,
} from "@/domain/persistence-types";
import type {
  ContractRepository,
  InvoiceRepository,
  PersistenceRepositories,
  RunInTransaction,
} from "@/domain/repositories";

const context: WorkspaceContext = {
  workspaceId: "workspace-trusted",
  userId: "user-1",
  role: "OWNER",
  timezone: "Europe/Rome",
};

function calendarDate(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
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
    paymentTermsDays: 30,
    paymentTermsNote: null,
    createdAt: calendarDate("2026-01-01"),
    updatedAt: calendarDate("2026-01-01"),
    ...overrides,
  };
}

function invoiceRecord(overrides: Partial<InvoiceRecord> = {}): InvoiceRecord {
  return {
    id: "invoice-1",
    workspaceId: context.workspaceId,
    contractId: "contract-1",
    invoiceDate: calendarDate("2026-09-01"),
    amount: "1500",
    currency: "EUR",
    reference: "INV-1",
    paymentTermsDays: 30,
    dueDate: calendarDate("2026-10-01"),
    voidedAt: null,
    createdAt: calendarDate("2026-09-01"),
    updatedAt: calendarDate("2026-09-01"),
    ...overrides,
  };
}

const validCreateInput = {
  contractId: "contract-1",
  invoiceDate: "2026-09-01",
  amount: "1500",
  reference: "INV-1",
};

function createFakeRepositories(
  seedContracts: ContractRecord[] = [],
  seedInvoices: InvoiceRecord[] = [],
) {
  const contracts = [...seedContracts];
  const invoices = [...seedInvoices];
  const calls: {
    getContract?: { workspaceId: string; contractId: string };
    create?: { workspaceId: string; input: CreateInvoiceInput };
    get?: { workspaceId: string; invoiceId: string };
    list?: {
      workspaceId: string;
      contractId: string;
      tracking?: InvoiceTrackingFilter;
    };
    update?: { workspaceId: string; invoiceId: string; input: UpdateInvoiceInput };
    void?: { workspaceId: string; invoiceId: string };
  } = {};

  const contractRepository: ContractRepository = {
    async createContract() {
      throw new Error("not used");
    },
    async getContract(workspaceId, contractId) {
      calls.getContract = { workspaceId, contractId };
      return (
        contracts.find(
          (row) => row.id === contractId && row.workspaceId === workspaceId,
        ) ?? null
      );
    },
    async listContracts() {
      return contracts.filter((row) => row.workspaceId === context.workspaceId);
    },
    async listContractsForClient() {
      return [];
    },
    async updateContract() {
      throw new Error("not used");
    },
    async findContractCoveringDate() {
      return null;
    },
    async lockContract(workspaceId, contractId) {
      calls.getContract = { workspaceId, contractId };
      return contractRepository.getContract(workspaceId, contractId);
    },
  };

  const invoiceRepository: InvoiceRepository = {
    async createInvoice(workspaceId, input) {
      calls.create = { workspaceId, input };
      const record = invoiceRecord({
        id: `invoice-${invoices.length + 1}`,
        workspaceId,
        contractId: input.contractId,
        invoiceDate: input.invoiceDate,
        amount: input.amount,
        currency: input.currency,
        reference: input.reference ?? null,
        paymentTermsDays: input.paymentTermsDays ?? null,
        dueDate: input.dueDate ?? null,
      });
      invoices.push(record);
      return record;
    },
    async getInvoice(workspaceId, invoiceId) {
      calls.get = { workspaceId, invoiceId };
      return (
        invoices.find((row) => row.id === invoiceId && row.workspaceId === workspaceId) ??
        null
      );
    },
    async lockInvoice(workspaceId, invoiceId) {
      return invoiceRepository.getInvoice(workspaceId, invoiceId);
    },
    async listInvoicesForContract(workspaceId, contractId, tracking = "ACTIVE") {
      calls.list = { workspaceId, contractId, tracking };
      return invoices.filter((row) => {
        if (row.workspaceId !== workspaceId || row.contractId !== contractId) {
          return false;
        }

        if (tracking === "ALL") {
          return true;
        }

        return tracking === "VOID" ? row.voidedAt !== null : row.voidedAt === null;
      });
    },
    async updateInvoice(workspaceId, invoiceId, input) {
      calls.update = { workspaceId, invoiceId, input };
      const index = invoices.findIndex(
        (row) =>
          row.id === invoiceId &&
          row.workspaceId === workspaceId &&
          row.voidedAt === null,
      );

      if (index === -1) {
        const existing = invoices.find(
          (row) => row.id === invoiceId && row.workspaceId === workspaceId,
        );
        if (existing) {
          throw new InvoiceNotEditableError();
        }
        throw new RecordNotFoundError("Invoice", invoiceId);
      }

      const current = invoices[index];
      const updated = invoiceRecord({
        ...current,
        invoiceDate: input.invoiceDate ?? current.invoiceDate,
        amount: input.amount ?? current.amount,
        reference: input.reference === undefined ? current.reference : input.reference,
        dueDate: input.dueDate === undefined ? current.dueDate : input.dueDate,
      });
      invoices[index] = updated;
      return updated;
    },
    async voidInvoice(workspaceId, invoiceId) {
      calls.void = { workspaceId, invoiceId };
      const index = invoices.findIndex(
        (row) => row.id === invoiceId && row.workspaceId === workspaceId,
      );

      if (index === -1) {
        throw new RecordNotFoundError("Invoice", invoiceId);
      }

      const current = invoices[index];
      const updated = invoiceRecord({
        ...current,
        voidedAt: current.voidedAt ?? new Date("2026-09-22T10:00:00.000Z"),
      });
      invoices[index] = updated;
      return updated;
    },
    async existsForContract(workspaceId, contractId) {
      return invoices.some(
        (row) => row.workspaceId === workspaceId && row.contractId === contractId,
      );
    },
  };

  return {
    contracts,
    invoices,
    calls,
    contractRepository,
    invoiceRepository,
    runInTransaction: (async (work) =>
      work({
        contracts: contractRepository,
        invoices: invoiceRepository,
      } as PersistenceRepositories)) as RunInTransaction,
  };
}

describe("invoice application services", () => {
  it("creates a valid invoice from trusted workspace context", async () => {
    const fake = createFakeRepositories([contractRecord()]);

    const created = await createInvoice(
      context,
      {
        ...validCreateInput,
        workspaceId: "workspace-from-form",
      } as typeof validCreateInput & { workspaceId: string },
      fake.runInTransaction,
    );

    expect(created.workspaceId).toBe("workspace-trusted");
    expect(fake.calls.create).toMatchObject({
      workspaceId: "workspace-trusted",
      input: {
        contractId: "contract-1",
        amount: "1500",
        currency: "EUR",
        paymentTermsDays: 30,
        reference: "INV-1",
      },
    });
    expect(fake.calls.create?.input.invoiceDate).toEqual(calendarDate("2026-09-01"));
    expect(fake.calls.create?.input.dueDate).toEqual(calendarDate("2026-10-01"));
    expect(fake.calls.create?.input).not.toHaveProperty("workspaceId");
    expect(fake.calls.getContract).toEqual({
      workspaceId: "workspace-trusted",
      contractId: "contract-1",
    });
  });

  it("rejects a non-positive amount", async () => {
    const fake = createFakeRepositories([contractRecord()]);

    await expect(
      createInvoice(
        context,
        { ...validCreateInput, amount: "0" },
        fake.runInTransaction,
      ),
    ).rejects.toMatchObject({ name: "InvalidInvoiceInputError", field: "amount" });
    expect(fake.calls.create).toBeUndefined();
  });

  it("snapshots contract currency and rejects a mismatched supplied currency", async () => {
    const fake = createFakeRepositories([contractRecord()]);

    const created = await createInvoice(
      context,
      { ...validCreateInput, currency: "eur" },
      fake.runInTransaction,
    );

    expect(created.currency).toBe("EUR");
    await expect(
      createInvoice(
        context,
        { ...validCreateInput, currency: "USD" },
        fake.runInTransaction,
      ),
    ).rejects.toMatchObject({ name: "InvalidInvoiceInputError", field: "currency" });
  });

  it("snapshots payment terms and computes dueDate", async () => {
    const fake = createFakeRepositories([contractRecord({ paymentTermsDays: 15 })]);

    await createInvoice(
      context,
      validCreateInput,
      fake.runInTransaction,
    );

    expect(fake.calls.create?.input).toMatchObject({
      paymentTermsDays: 15,
    });
    expect(fake.calls.create?.input.dueDate).toEqual(calendarDate("2026-09-16"));
  });

  it("uses invoiceDate as dueDate when contract terms are zero", async () => {
    const fake = createFakeRepositories([contractRecord({ paymentTermsDays: 0 })]);

    await createInvoice(
      context,
      validCreateInput,
      fake.runInTransaction,
    );

    expect(fake.calls.create?.input.paymentTermsDays).toBe(0);
    expect(fake.calls.create?.input.dueDate).toEqual(calendarDate("2026-09-01"));
  });

  it("keeps dueDate null when contract terms are null", async () => {
    const fake = createFakeRepositories([contractRecord({ paymentTermsDays: null })]);

    await createInvoice(
      context,
      validCreateInput,
      fake.runInTransaction,
    );

    expect(fake.calls.create?.input.paymentTermsDays).toBeNull();
    expect(fake.calls.create?.input.dueDate).toBeNull();
  });

  it("allows create on an expired contract and an archived client", async () => {
    const expired = createFakeRepositories([
      contractRecord({ validTo: calendarDate("2026-02-01") }),
    ]);
    const archived = createFakeRepositories([contractRecord()]);

    await expect(
      createInvoice(
        context,
        validCreateInput,
        expired.runInTransaction,
      ),
    ).resolves.toMatchObject({ contractId: "contract-1" });
    await expect(
      createInvoice(
        context,
        validCreateInput,
        archived.runInTransaction,
      ),
    ).resolves.toMatchObject({ contractId: "contract-1" });
  });

  it("rejects a missing or foreign contract", async () => {
    const fake = createFakeRepositories([
      contractRecord({ id: "contract-foreign", workspaceId: "workspace-other" }),
    ]);

    await expect(
      createInvoice(
        context,
        validCreateInput,
        fake.runInTransaction,
      ),
    ).rejects.toBeInstanceOf(ContractNotFoundError);
    await expect(
      createInvoice(
        context,
        { ...validCreateInput, contractId: "contract-foreign" },
        fake.runInTransaction,
      ),
    ).rejects.toBeInstanceOf(ContractNotFoundError);
    expect(fake.calls.create).toBeUndefined();
  });

  it("gets ACTIVE and VOID invoices by id using workspace context", async () => {
    const fake = createFakeRepositories(
      [contractRecord()],
      [
        invoiceRecord(),
        invoiceRecord({
          id: "invoice-void",
          voidedAt: new Date("2026-09-22T10:00:00.000Z"),
        }),
        invoiceRecord({ id: "invoice-foreign", workspaceId: "workspace-other" }),
      ],
    );

    const now = new Date("2026-09-22T00:30:00.000Z");
    await expect(getInvoice(context, "invoice-1", fake.invoiceRepository, now)).resolves.toMatchObject({
      id: "invoice-1",
      trackingState: "ACTIVE",
      paidAmount: "0",
      amountStatus: "UNPAID",
      overdue: false,
    });
    await expect(
      getInvoice(context, "invoice-void", fake.invoiceRepository, now),
    ).resolves.toMatchObject({
      id: "invoice-void",
      trackingState: "VOID",
      paidAmount: "0",
      amountStatus: "UNPAID",
    });
    await expect(getInvoice(context, "missing", fake.invoiceRepository)).rejects.toBeInstanceOf(
      InvoiceNotFoundError,
    );
    await expect(
      getInvoice(context, "invoice-foreign", fake.invoiceRepository),
    ).rejects.toBeInstanceOf(InvoiceNotFoundError);
    expect(fake.calls.get).toEqual({
      workspaceId: "workspace-trusted",
      invoiceId: "invoice-foreign",
    });
  });

  it("lists ACTIVE invoices by default and accepts VOID/ALL filters", async () => {
    const fake = createFakeRepositories(
      [contractRecord()],
      [
        invoiceRecord(),
        invoiceRecord({
          id: "invoice-void",
          voidedAt: new Date("2026-09-22T10:00:00.000Z"),
        }),
      ],
    );

    const now = new Date("2026-09-22T00:30:00.000Z");
    const listed = await listInvoicesForContract(
      context,
      "contract-1",
      fake.contractRepository,
      fake.invoiceRepository,
      undefined,
      now,
    );
    const voided = await listInvoicesForContract(
      context,
      "contract-1",
      fake.contractRepository,
      fake.invoiceRepository,
      "VOID",
      now,
    );

    expect(listed.map((row) => row.id)).toEqual(["invoice-1"]);
    expect(listed[0]).toMatchObject({
      trackingState: "ACTIVE",
      paidAmount: "0",
      amountStatus: "UNPAID",
      overdue: false,
    });
    expect(voided.map((row) => row.id)).toEqual(["invoice-void"]);
    expect(voided[0]).toMatchObject({ trackingState: "VOID" });
    expect(fake.calls.list).toEqual({
      workspaceId: "workspace-trusted",
      contractId: "contract-1",
      tracking: "VOID",
    });
    await expect(
      listInvoicesForContract(
        context,
        "missing",
        fake.contractRepository,
        fake.invoiceRepository,
      ),
    ).rejects.toBeInstanceOf(ContractNotFoundError);
  });

  it("updates ACTIVE invoiceDate, amount, and reference and recalculates dueDate from the snapshot", async () => {
    const fake = createFakeRepositories(
      [contractRecord({ paymentTermsDays: 7 })],
      [invoiceRecord({ paymentTermsDays: 30, dueDate: calendarDate("2026-10-01") })],
    );

    const updated = await updateInvoice(
      context,
      "invoice-1",
      {
        invoiceDate: "2026-09-10",
        amount: "1750.25",
        reference: "INV-UPDATED",
      },
      fake.invoiceRepository,
    );

    expect(updated).toMatchObject({
      amount: "1750.25",
      reference: "INV-UPDATED",
      paymentTermsDays: 30,
      currency: "EUR",
      contractId: "contract-1",
    });
    expect(fake.calls.update?.input.invoiceDate).toEqual(calendarDate("2026-09-10"));
    expect(fake.calls.update?.input.dueDate).toEqual(calendarDate("2026-10-10"));
    expect(fake.calls.update?.workspaceId).toBe("workspace-trusted");
  });

  it("keeps dueDate null when the terms snapshot is null", async () => {
    const fake = createFakeRepositories(
      [contractRecord({ paymentTermsDays: 30 })],
      [invoiceRecord({ paymentTermsDays: null, dueDate: null })],
    );

    await updateInvoice(
      context,
      "invoice-1",
      { invoiceDate: "2026-09-20" },
      fake.invoiceRepository,
    );

    expect(fake.calls.update?.input.dueDate).toBeNull();
  });

  it("rejects immutable fields and VOID updates", async () => {
    const fake = createFakeRepositories(
      [contractRecord()],
      [
        invoiceRecord(),
        invoiceRecord({
          id: "invoice-void",
          voidedAt: new Date("2026-09-22T10:00:00.000Z"),
        }),
      ],
    );

    await expect(
      updateInvoice(
        context,
        "invoice-1",
        { invoiceDate: "2026-09-10", currency: "USD" },
        fake.invoiceRepository,
      ),
    ).rejects.toMatchObject({ name: "InvalidInvoiceInputError", field: "currency" });
    await expect(
      updateInvoice(
        context,
        "invoice-1",
        { invoiceDate: "2026-09-10", contractId: "contract-other" },
        fake.invoiceRepository,
      ),
    ).rejects.toMatchObject({ name: "InvalidInvoiceInputError", field: "contractId" });
    await expect(
      updateInvoice(
        context,
        "invoice-1",
        { invoiceDate: "2026-09-10", dueDate: "2026-12-01" },
        fake.invoiceRepository,
      ),
    ).rejects.toMatchObject({ name: "InvalidInvoiceInputError", field: "dueDate" });
    await expect(
      updateInvoice(
        context,
        "invoice-void",
        { amount: "10" },
        fake.invoiceRepository,
      ),
    ).rejects.toBeInstanceOf(InvoiceNotEditableError);
    expect(fake.calls.update).toBeUndefined();
  });

  it("does not map a concurrent VOID update to not found", async () => {
    const fake = createFakeRepositories([contractRecord()], [invoiceRecord()]);
    fake.invoiceRepository.updateInvoice = async () => {
      throw new InvoiceNotEditableError();
    };

    await expect(
      updateInvoice(context, "invoice-1", { amount: "10" }, fake.invoiceRepository),
    ).rejects.toBeInstanceOf(InvoiceNotEditableError);
  });

  it("voids an ACTIVE invoice and rejects restore or re-void", async () => {
    const fake = createFakeRepositories([contractRecord()], [invoiceRecord()]);

    const voided = await voidInvoice(context, "invoice-1", fake.invoiceRepository);

    expect(voided.voidedAt).not.toBeNull();
    expect(fake.invoices[0]?.id).toBe("invoice-1");
    expect(fake.calls.void).toEqual({
      workspaceId: "workspace-trusted",
      invoiceId: "invoice-1",
    });
    await expect(voidInvoice(context, "invoice-1", fake.invoiceRepository)).rejects.toBeInstanceOf(
      InvoiceAlreadyVoidedError,
    );
    await expect(
      updateInvoice(context, "invoice-1", { amount: "10" }, fake.invoiceRepository),
    ).rejects.toBeInstanceOf(InvoiceNotEditableError);
  });

  it("does not treat invoiceId as a tenant grant", async () => {
    const fake = createFakeRepositories(
      [contractRecord({ id: "contract-foreign", workspaceId: "workspace-other" })],
      [invoiceRecord({ id: "invoice-foreign", workspaceId: "workspace-other" })],
    );

    await expect(
      updateInvoice(context, "invoice-foreign", { amount: "10" }, fake.invoiceRepository),
    ).rejects.toBeInstanceOf(InvoiceNotFoundError);
    await expect(voidInvoice(context, "invoice-foreign", fake.invoiceRepository)).rejects.toBeInstanceOf(
      InvoiceNotFoundError,
    );
    await expect(
      listInvoicesForContract(
        context,
        "contract-foreign",
        fake.contractRepository,
        fake.invoiceRepository,
      ),
    ).rejects.toBeInstanceOf(ContractNotFoundError);
  });
});

describe("invoice input parsing", () => {
  it("rejects an invalid calendar invoiceDate", async () => {
    const fake = createFakeRepositories([contractRecord()]);

    await expect(
      createInvoice(
        context,
        { ...validCreateInput, invoiceDate: "2026-02-29" },
        fake.runInTransaction,
      ),
    ).rejects.toBeInstanceOf(InvalidInvoiceInputError);
  });
});

describe("invoice derived read view", () => {
  it("marks an unpaid past-due invoice overdue using workspace timezone", async () => {
    const now = new Date("2026-09-22T00:30:00.000Z");
    const fake = createFakeRepositories(
      [contractRecord()],
      [invoiceRecord({ dueDate: calendarDate("2026-09-21") })],
    );

    const rome = await getInvoice(context, "invoice-1", fake.invoiceRepository, now);
    const losAngeles = await getInvoice(
      { ...context, timezone: "America/Los_Angeles" },
      "invoice-1",
      fake.invoiceRepository,
      now,
    );

    expect(rome).toMatchObject({
      amountStatus: "UNPAID",
      paidAmount: "0",
      overdue: true,
    });
    expect(losAngeles.overdue).toBe(false);
    expect(fake.invoices[0]).not.toHaveProperty("amountStatus");
    expect(fake.invoices[0]).not.toHaveProperty("overdue");
    expect(fake.invoices[0]).not.toHaveProperty("paidAmount");
  });

  it("does not treat dueDate = today or null terms as overdue", async () => {
    const now = new Date("2026-09-22T10:00:00.000Z");
    const fake = createFakeRepositories(
      [contractRecord()],
      [
        invoiceRecord({ dueDate: calendarDate("2026-09-22") }),
        invoiceRecord({
          id: "invoice-no-terms",
          paymentTermsDays: null,
          dueDate: null,
        }),
      ],
    );

    await expect(
      getInvoice(context, "invoice-1", fake.invoiceRepository, now),
    ).resolves.toMatchObject({ overdue: false, amountStatus: "UNPAID" });
    await expect(
      getInvoice(context, "invoice-no-terms", fake.invoiceRepository, now),
    ).resolves.toMatchObject({ overdue: false, dueDate: null });
  });

  it("does not persist derived fields and keeps VOID invoices non-editable", async () => {
    const fake = createFakeRepositories(
      [contractRecord()],
      [
        invoiceRecord({
          id: "invoice-void",
          dueDate: calendarDate("2026-09-01"),
          voidedAt: new Date("2026-09-22T10:00:00.000Z"),
        }),
      ],
    );

    const view = await getInvoice(
      context,
      "invoice-void",
      fake.invoiceRepository,
      new Date("2026-09-22T10:00:00.000Z"),
    );

    expect(view.trackingState).toBe("VOID");
    expect(view.amountStatus).toBe("UNPAID");
    expect(fake.invoices[0]?.voidedAt).not.toBeNull();
    expect(fake.invoices[0]).not.toHaveProperty("amountStatus");
    await expect(
      updateInvoice(context, "invoice-void", { amount: "10" }, fake.invoiceRepository),
    ).rejects.toBeInstanceOf(InvoiceNotEditableError);
  });
});
