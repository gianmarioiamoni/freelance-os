// tests/integration/persistence/invoices.test.ts
import { describe, expect, it } from "vitest";

import { InvoiceNotEditableError } from "@/domain/invoice-errors";
import {
  ConstraintViolationError,
  ForeignKeyViolationError,
  RecordNotFoundError,
} from "@/domain/persistence-errors";
import { invoiceTrackingState } from "@/domain/invoice";

import { createWorkspaceGraph } from "./fixtures";
import { date, prisma, repositories } from "./helpers";

async function createInvoiceOnGraph(
  workspaceId: string,
  contractId: string,
  overrides: {
    invoiceDate?: Date;
    amount?: string;
    currency?: string;
    reference?: string | null;
    paymentTermsDays?: number | null;
    dueDate?: Date | null;
  } = {},
) {
  return repositories.invoices.createInvoice(workspaceId, {
    contractId,
    invoiceDate: overrides.invoiceDate ?? date("2026-09-01"),
    amount: overrides.amount ?? "1500.0000",
    currency: overrides.currency ?? "EUR",
    reference: overrides.reference,
    paymentTermsDays: overrides.paymentTermsDays,
    dueDate: overrides.dueDate,
  });
}

describe("invoice persistence", () => {
  it("creates and reads an invoice bound to a workspace contract", async () => {
    const graph = await createWorkspaceGraph(repositories, "inv-create");

    const created = await createInvoiceOnGraph(graph.workspaceId, graph.contractId, {
      reference: "INV-100",
      paymentTermsDays: 30,
      dueDate: date("2026-10-01"),
    });

    const loaded = await repositories.invoices.getInvoice(graph.workspaceId, created.id);

    expect(loaded).toMatchObject({
      id: created.id,
      workspaceId: graph.workspaceId,
      contractId: graph.contractId,
      amount: "1500.0000",
      currency: "EUR",
      reference: "INV-100",
      paymentTermsDays: 30,
      voidedAt: null,
    });
    expect(invoiceTrackingState(loaded?.voidedAt ?? null)).toBe("ACTIVE");
    expect(loaded?.invoiceDate).toEqual(date("2026-09-01"));
    expect(loaded?.dueDate).toEqual(date("2026-10-01"));
    expect(await repositories.invoices.existsForContract(graph.workspaceId, graph.contractId)).toBe(
      true,
    );
  });

  it("persists currency, paymentTermsDays, and dueDate snapshots independently of later Contract edits", async () => {
    const graph = await createWorkspaceGraph(repositories, "inv-snap");

    await repositories.contracts.updateContract(graph.workspaceId, graph.contractId, {
      validFrom: date("2026-01-01"),
      validTo: date("2026-07-01"),
      billingModel: "HOURLY",
      rate: "80.0000",
      currency: "EUR",
      paymentTermsDays: 30,
    });

    const invoice = await createInvoiceOnGraph(graph.workspaceId, graph.contractId, {
      currency: "EUR",
      paymentTermsDays: 30,
      dueDate: date("2026-10-01"),
    });

    await repositories.contracts.updateContract(graph.workspaceId, graph.contractId, {
      validFrom: date("2026-01-01"),
      validTo: date("2026-07-01"),
      billingModel: "DAILY",
      rate: "99.0000",
      currency: "USD",
      paymentTermsDays: 7,
    });

    const persisted = await repositories.invoices.getInvoice(graph.workspaceId, invoice.id);
    const contract = await repositories.contracts.getContract(graph.workspaceId, graph.contractId);

    expect(contract).toMatchObject({
      currency: "USD",
      paymentTermsDays: 7,
    });
    expect(persisted).toMatchObject({
      currency: "EUR",
      paymentTermsDays: 30,
      contractId: graph.contractId,
    });
    expect(persisted?.dueDate).toEqual(date("2026-10-01"));
  });

  it("allows invoices on an expired contract and an archived-client contract", async () => {
    const graph = await createWorkspaceGraph(repositories, "inv-arch");

    const expired = await createInvoiceOnGraph(graph.workspaceId, graph.contractId);
    expect(expired.contractId).toBe(graph.contractId);

    await repositories.clients.archiveClient(graph.workspaceId, graph.clientId);

    const afterArchive = await createInvoiceOnGraph(graph.workspaceId, graph.contractId, {
      invoiceDate: date("2026-09-15"),
      amount: "200.0000",
    });

    expect(afterArchive.contractId).toBe(graph.contractId);
    expect(
      await repositories.invoices.listInvoicesForContract(graph.workspaceId, graph.contractId),
    ).toHaveLength(2);
  });

  it("lists ACTIVE invoices by default and keeps VOID readable by id", async () => {
    const graph = await createWorkspaceGraph(repositories, "inv-void");
    const active = await createInvoiceOnGraph(graph.workspaceId, graph.contractId, {
      invoiceDate: date("2026-09-01"),
    });
    const toVoid = await createInvoiceOnGraph(graph.workspaceId, graph.contractId, {
      invoiceDate: date("2026-09-02"),
      amount: "80.0000",
    });

    const voided = await repositories.invoices.voidInvoice(graph.workspaceId, toVoid.id);
    const stillPresent = await prisma.invoice.findUnique({ where: { id: toVoid.id } });

    expect(voided.voidedAt).not.toBeNull();
    expect(invoiceTrackingState(voided.voidedAt)).toBe("VOID");
    expect(stillPresent).not.toBeNull();
    expect(
      await repositories.invoices.listInvoicesForContract(graph.workspaceId, graph.contractId),
    ).toEqual([expect.objectContaining({ id: active.id, voidedAt: null })]);
    expect(
      await repositories.invoices.listInvoicesForContract(
        graph.workspaceId,
        graph.contractId,
        "VOID",
      ),
    ).toEqual([expect.objectContaining({ id: toVoid.id })]);
    expect(
      await repositories.invoices.getInvoice(graph.workspaceId, toVoid.id),
    ).toMatchObject({ id: toVoid.id });
    expect(await repositories.invoices.existsForContract(graph.workspaceId, graph.contractId)).toBe(
      true,
    );
  });

  it("updates foundation fields without moving contractId or rewriting snapshots", async () => {
    const graph = await createWorkspaceGraph(repositories, "inv-upd");
    const invoice = await createInvoiceOnGraph(graph.workspaceId, graph.contractId, {
      currency: "EUR",
      paymentTermsDays: 15,
      dueDate: date("2026-09-16"),
      reference: "keep",
    });

    const updated = await repositories.invoices.updateInvoice(graph.workspaceId, invoice.id, {
      invoiceDate: date("2026-09-10"),
      amount: "1750.2500",
      reference: "INV-UPDATED",
      dueDate: date("2026-09-25"),
    });

    expect(updated).toMatchObject({
      id: invoice.id,
      workspaceId: graph.workspaceId,
      contractId: graph.contractId,
      amount: "1750.2500",
      currency: "EUR",
      paymentTermsDays: 15,
      reference: "INV-UPDATED",
    });
    expect(updated.invoiceDate).toEqual(date("2026-09-10"));
    expect(updated.dueDate).toEqual(date("2026-09-25"));
  });

  it("rejects a repository update of a VOID invoice", async () => {
    const graph = await createWorkspaceGraph(repositories, "inv-void-upd");
    const invoice = await createInvoiceOnGraph(graph.workspaceId, graph.contractId);
    await repositories.invoices.voidInvoice(graph.workspaceId, invoice.id);

    await expect(
      repositories.invoices.updateInvoice(graph.workspaceId, invoice.id, {
        amount: "9.0000",
      }),
    ).rejects.toBeInstanceOf(InvoiceNotEditableError);

    const persisted = await prisma.invoice.findUnique({ where: { id: invoice.id } });
    expect(persisted?.voidedAt).not.toBeNull();
    expect(persisted?.amount.toFixed(4)).toBe(invoice.amount);
  });

  it("does not expose workspace A invoices through workspace B operations", async () => {
    const workspaceA = await createWorkspaceGraph(repositories, "inv-iso-a");
    const workspaceB = await createWorkspaceGraph(repositories, "inv-iso-b");
    const invoice = await createInvoiceOnGraph(workspaceA.workspaceId, workspaceA.contractId);

    expect(await repositories.invoices.getInvoice(workspaceB.workspaceId, invoice.id)).toBeNull();
    expect(
      await repositories.invoices.listInvoicesForContract(
        workspaceB.workspaceId,
        workspaceA.contractId,
      ),
    ).toEqual([]);
    expect(
      await repositories.invoices.existsForContract(workspaceB.workspaceId, workspaceA.contractId),
    ).toBe(false);

    await expect(
      repositories.invoices.updateInvoice(workspaceB.workspaceId, invoice.id, {
        amount: "1.0000",
      }),
    ).rejects.toBeInstanceOf(RecordNotFoundError);

    await expect(
      repositories.invoices.voidInvoice(workspaceB.workspaceId, invoice.id),
    ).rejects.toBeInstanceOf(RecordNotFoundError);

    expect(await repositories.invoices.getInvoice(workspaceA.workspaceId, invoice.id)).toMatchObject(
      { id: invoice.id, workspaceId: workspaceA.workspaceId },
    );
    expect(
      await repositories.contracts.lockContract(workspaceB.workspaceId, workspaceA.contractId),
    ).toBeNull();
  });

  it("rejects a cross-workspace contract association", async () => {
    const workspaceA = await createWorkspaceGraph(repositories, "inv-fk-a");
    const workspaceB = await createWorkspaceGraph(repositories, "inv-fk-b");

    await expect(
      createInvoiceOnGraph(workspaceB.workspaceId, workspaceA.contractId),
    ).rejects.toBeInstanceOf(ForeignKeyViolationError);
  });

  it("rejects non-positive amounts and inconsistent dueDate / terms pairs", async () => {
    const graph = await createWorkspaceGraph(repositories, "inv-chk");

    await expect(
      createInvoiceOnGraph(graph.workspaceId, graph.contractId, { amount: "0" }),
    ).rejects.toBeInstanceOf(ConstraintViolationError);

    await expect(
      createInvoiceOnGraph(graph.workspaceId, graph.contractId, { amount: "-10.0000" }),
    ).rejects.toBeInstanceOf(ConstraintViolationError);

    await expect(
      createInvoiceOnGraph(graph.workspaceId, graph.contractId, {
        paymentTermsDays: 30,
        dueDate: null,
      }),
    ).rejects.toBeInstanceOf(ConstraintViolationError);

    await expect(
      createInvoiceOnGraph(graph.workspaceId, graph.contractId, {
        paymentTermsDays: null,
        dueDate: date("2026-10-01"),
      }),
    ).rejects.toBeInstanceOf(ConstraintViolationError);
  });
});
