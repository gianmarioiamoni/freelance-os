// tests/integration/persistence/constraints.test.ts
import { describe, expect, it } from "vitest";

import { ConstraintViolationError } from "@/domain/persistence-errors";

import { createWorkspaceGraph } from "./fixtures";
import { date, repositories } from "./helpers";

describe("database value constraints", () => {
  it("rejects non-positive durations and rates", async () => {
    const graph = await createWorkspaceGraph(repositories, "values");

    await expect(
      repositories.timeEntries.recordTimeEntry(graph.workspaceId, {
        userId: graph.userId,
        clientId: graph.clientId,
        contractId: graph.contractId,
        workDate: date("2026-02-01"),
        durationMinutes: 0,
        billable: true,
      }),
    ).rejects.toBeInstanceOf(ConstraintViolationError);

    await expect(
      repositories.timeEntries.recordTimeEntry(graph.workspaceId, {
        userId: graph.userId,
        clientId: graph.clientId,
        contractId: graph.contractId,
        workDate: date("2026-02-01"),
        durationMinutes: -15,
        billable: true,
      }),
    ).rejects.toBeInstanceOf(ConstraintViolationError);

    await expect(
      repositories.contracts.createContract(graph.workspaceId, {
        clientId: graph.clientId,
        validFrom: date("2027-01-01"),
        validTo: date("2027-07-01"),
        billingModel: "HOURLY",
        rate: "0",
        currency: "EUR",
      }),
    ).rejects.toBeInstanceOf(ConstraintViolationError);

    await expect(
      repositories.contracts.createContract(graph.workspaceId, {
        clientId: graph.clientId,
        validFrom: date("2027-01-01"),
        validTo: date("2027-07-01"),
        billingModel: "HOURLY",
        rate: "-10.0000",
        currency: "EUR",
      }),
    ).rejects.toBeInstanceOf(ConstraintViolationError);
  });

  it("rejects negative allocatedMinutes", async () => {
    const graph = await createWorkspaceGraph(repositories, "allocation-bound");

    await expect(
      repositories.contracts.createContract(graph.workspaceId, {
        clientId: graph.clientId,
        validFrom: date("2027-01-01"),
        validTo: date("2027-07-01"),
        billingModel: "HOURLY",
        rate: "80.0000",
        currency: "EUR",
        allocatedMinutes: -1,
      }),
    ).rejects.toBeInstanceOf(ConstraintViolationError);
  });

  it("rejects settings thresholds outside 1..100", async () => {
    const graph = await createWorkspaceGraph(repositories, "thresholds");

    await expect(
      repositories.settings.putSettings(graph.workspaceId, {
        timezone: "Europe/Rome",
        currency: "EUR",
        contractWarningPercent: 0,
        monthlyCapacityWarningPercent: 80,
      }),
    ).rejects.toBeInstanceOf(ConstraintViolationError);

    await expect(
      repositories.settings.putSettings(graph.workspaceId, {
        timezone: "Europe/Rome",
        currency: "EUR",
        contractWarningPercent: 101,
        monthlyCapacityWarningPercent: 80,
      }),
    ).rejects.toBeInstanceOf(ConstraintViolationError);

    await expect(
      repositories.settings.putSettings(graph.workspaceId, {
        timezone: "Europe/Rome",
        currency: "EUR",
        contractWarningPercent: 80,
        monthlyCapacityWarningPercent: 0,
      }),
    ).rejects.toBeInstanceOf(ConstraintViolationError);

    await expect(
      repositories.settings.putSettings(graph.workspaceId, {
        timezone: "Europe/Rome",
        currency: "EUR",
        contractWarningPercent: 80,
        monthlyCapacityWarningPercent: 101,
      }),
    ).rejects.toBeInstanceOf(ConstraintViolationError);
  });
});
