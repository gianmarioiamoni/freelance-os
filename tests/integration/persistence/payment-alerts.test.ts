// tests/integration/persistence/payment-alerts.test.ts
import { describe, expect, it } from "vitest";

import { UniqueConstraintViolationError } from "@/domain/persistence-errors";

import { createWorkspaceGraph } from "./fixtures";
import { date, repositories } from "./helpers";

describe("payment alert persistence", () => {
  it("persists PAYMENT_* types with invoiceId and keeps CONTRACT_* rows valid", async () => {
    const graph = await createWorkspaceGraph(repositories, "pay-alert-schema");
    const invoice = await repositories.invoices.createInvoice(graph.workspaceId, {
      contractId: graph.contractId,
      invoiceDate: date("2026-09-01"),
      amount: "1000.0000",
      currency: "EUR",
    });

    const contractAlert = await repositories.alerts.createAlert(graph.workspaceId, {
      type: "CONTRACT_WARNING",
      severity: "WARNING",
      contractId: graph.contractId,
      periodStart: date("2026-09-01"),
      periodEnd: date("2026-10-01"),
      deduplicationKey: `cw:${graph.workspaceId}:${graph.contractId}:2026-09-01`,
    });
    const paymentAlert = await repositories.alerts.createAlert(graph.workspaceId, {
      type: "PAYMENT_PARTIAL",
      severity: "INFO",
      contractId: graph.contractId,
      invoiceId: invoice.id,
      deduplicationKey: `pp:${graph.workspaceId}:${invoice.id}`,
    });

    expect(contractAlert.invoiceId).toBeNull();
    expect(paymentAlert).toMatchObject({
      type: "PAYMENT_PARTIAL",
      invoiceId: invoice.id,
      workspaceId: graph.workspaceId,
    });
    expect(
      await repositories.alerts.findActiveAlertByInvoiceAndType(
        graph.workspaceId,
        invoice.id,
        "PAYMENT_PARTIAL",
      ),
    ).toMatchObject({ id: paymentAlert.id });
    expect(
      await repositories.alerts.findActiveAlertByContractAndType(
        graph.workspaceId,
        graph.contractId,
        "CONTRACT_WARNING",
        date("2026-09-01"),
      ),
    ).toMatchObject({ id: contractAlert.id });
  });

  it("resolves semantically by invoiceId + type and enforces workspace isolation", async () => {
    const graphA = await createWorkspaceGraph(repositories, "pay-alert-iso-a");
    const graphB = await createWorkspaceGraph(repositories, "pay-alert-iso-b");
    const invoiceA = await repositories.invoices.createInvoice(graphA.workspaceId, {
      contractId: graphA.contractId,
      invoiceDate: date("2026-09-01"),
      amount: "1000.0000",
      currency: "EUR",
    });
    const created = await repositories.alerts.createAlert(graphA.workspaceId, {
      type: "PAYMENT_OVERDUE",
      severity: "WARNING",
      invoiceId: invoiceA.id,
      deduplicationKey: `po:${graphA.workspaceId}:${invoiceA.id}`,
    });

    expect(
      await repositories.alerts.findActiveAlertByInvoiceAndType(
        graphB.workspaceId,
        invoiceA.id,
        "PAYMENT_OVERDUE",
      ),
    ).toBeNull();

    const resolved = await repositories.alerts.resolveAlert(
      graphA.workspaceId,
      created.id,
      new Date("2026-09-22T10:00:00.000Z"),
    );
    expect(resolved.resolvedAt).not.toBeNull();
    expect(
      await repositories.alerts.findActiveAlertByInvoiceAndType(
        graphA.workspaceId,
        invoiceA.id,
        "PAYMENT_OVERDUE",
      ),
    ).toBeNull();
  });

  it("rejects a duplicate active deduplicationKey", async () => {
    const graph = await createWorkspaceGraph(repositories, "pay-alert-dup");
    const invoice = await repositories.invoices.createInvoice(graph.workspaceId, {
      contractId: graph.contractId,
      invoiceDate: date("2026-09-01"),
      amount: "1000.0000",
      currency: "EUR",
    });
    const key = `pm:${graph.workspaceId}:${invoice.id}`;

    await repositories.alerts.createAlert(graph.workspaceId, {
      type: "PAYMENT_MISMATCH",
      severity: "ERROR",
      invoiceId: invoice.id,
      deduplicationKey: key,
    });

    await expect(
      repositories.alerts.createAlert(graph.workspaceId, {
        type: "PAYMENT_MISMATCH",
        severity: "ERROR",
        invoiceId: invoice.id,
        deduplicationKey: key,
      }),
    ).rejects.toBeInstanceOf(UniqueConstraintViolationError);
  });
});
