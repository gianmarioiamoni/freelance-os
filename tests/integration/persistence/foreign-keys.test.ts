// tests/integration/persistence/foreign-keys.test.ts
import { describe, expect, it } from "vitest";

import { ForeignKeyViolationError } from "@/domain/persistence-errors";

import { createWorkspaceGraph } from "./fixtures";
import { date, repositories } from "./helpers";

describe("foreign key and workspace constraints", () => {
  it("rejects a client bound to a missing workspace", async () => {
    await expect(
      repositories.clients.createClient("00000000-0000-4000-8000-000000000099", {
        companyName: "Orphan Client",
      }),
    ).rejects.toBeInstanceOf(ForeignKeyViolationError);
  });

  it("rejects contract, time-entry, alert, and notification cross-workspace references", async () => {
    const workspaceA = await createWorkspaceGraph(repositories, "fk-a");
    const workspaceB = await createWorkspaceGraph(repositories, "fk-b");

    await expect(
      repositories.contracts.createContract(workspaceB.workspaceId, {
        clientId: workspaceA.clientId,
        validFrom: date("2028-01-01"),
        validTo: date("2028-07-01"),
        billingModel: "HOURLY",
        rate: "60.0000",
        currency: "EUR",
      }),
    ).rejects.toBeInstanceOf(ForeignKeyViolationError);

    await expect(
      repositories.timeEntries.recordTimeEntry(workspaceB.workspaceId, {
        userId: workspaceB.userId,
        clientId: workspaceA.clientId,
        contractId: workspaceA.contractId,
        workDate: date("2026-02-01"),
        durationMinutes: 60,
        billable: true,
      }),
    ).rejects.toBeInstanceOf(ForeignKeyViolationError);

    await expect(
      repositories.alerts.createAlert(workspaceB.workspaceId, {
        type: "CONTRACT_WARNING",
        severity: "WARNING",
        clientId: workspaceA.clientId,
        deduplicationKey: "cross-workspace-client",
      }),
    ).rejects.toBeInstanceOf(ForeignKeyViolationError);

    await expect(
      repositories.alerts.createAlert(workspaceB.workspaceId, {
        type: "CONTRACT_WARNING",
        severity: "WARNING",
        contractId: workspaceA.contractId,
        deduplicationKey: "cross-workspace-contract",
      }),
    ).rejects.toBeInstanceOf(ForeignKeyViolationError);

    const alertA = await repositories.alerts.createAlert(workspaceA.workspaceId, {
      type: "CONTRACT_EXCEEDED",
      severity: "ERROR",
      clientId: workspaceA.clientId,
      contractId: workspaceA.contractId,
      deduplicationKey: "workspace-a-exceeded",
    });

    await expect(
      repositories.notifications.createNotification(workspaceB.workspaceId, {
        userId: workspaceB.userId,
        alertId: alertA.id,
        type: "ALERT",
        title: "Cross-workspace alert",
        body: "Must be rejected",
      }),
    ).rejects.toBeInstanceOf(ForeignKeyViolationError);
  });
});
