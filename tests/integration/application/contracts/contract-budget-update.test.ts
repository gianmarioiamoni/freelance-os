// tests/integration/application/contracts/contract-budget-update.test.ts
import { beforeEach, describe, expect, it } from "vitest";

import { createClient } from "@/application/clients/create-client";
import { createContract } from "@/application/contracts/create-contract";
import { updateContract } from "@/application/contracts/update-contract";
import { createFirstWorkspace } from "@/application/workspace/create-first-workspace";
import type { WorkspaceContext } from "@/application/workspace/workspace-context";

import { repositories, runInTransaction } from "../../persistence/helpers";

describe("Contract Budget UPDATE Preservation", () => {
  let context: WorkspaceContext;

  beforeEach(async () => {
    const created = await createFirstWorkspace(
      `test-budget-update-${Date.now()}`,
      {
        name: "Test Budget Update",
        currency: "EUR",
        timezone: "Europe/Rome",
      },
      { runInTransaction },
    );
    context = created.context;
  });

  it("preserves existing explicit allocatedMinutes when not provided in update", async () => {
    const client = await createClient(
      context,
      {
        companyName: "ACME Corp",
        email: "",
        phone: "",
        address: "",
        vatNumber: "",
        notes: "",
      },
      repositories.clients,
    );

    // Create with explicit allocatedMinutes
    const contract = await createContract(
      context,
      {
        clientId: client.id,
        validFrom: "2026-01-01",
        validTo: "2026-07-01",
        billingModel: "HOURLY",
        rate: "80",
        currency: "EUR",
        monthlyContractedHours: "96", // 96h/month = 5760min
        allocatedMinutes: "30000", // explicit 500h
      },
      repositories.clients,
      repositories.contracts,
    );

    expect(contract.allocatedMinutes).toBe(30000);

    // Update monthly hours WITHOUT providing allocatedMinutes
    const updated = await updateContract(
      context,
      contract.id,
      {
        validFrom: "2026-01-01",
        validTo: "2026-07-01",
        billingModel: "HOURLY",
        rate: "80",
        currency: "EUR",
        monthlyContractedHours: "120", // changed to 120h/month
        // allocatedMinutes NOT provided - should preserve 30000
      },
      runInTransaction,
    );

    expect(updated.allocatedMinutes).toBe(30000); // preserved explicit value
    expect(updated.monthlyContractedMinutes).toBe(7200); // 120h updated
  });

  it("updates allocatedMinutes when explicitly provided", async () => {
    const client = await createClient(
      context,
      {
        companyName: "Beta Inc",
        email: "",
        phone: "",
        address: "",
        vatNumber: "",
        notes: "",
      },
      repositories.clients,
    );

    const contract = await createContract(
      context,
      {
        clientId: client.id,
        validFrom: "2026-01-01",
        validTo: "2026-07-01",
        billingModel: "HOURLY",
        rate: "90",
        currency: "EUR",
        allocatedMinutes: "30000", // explicit 500h
      },
      repositories.clients,
      repositories.contracts,
    );

    expect(contract.allocatedMinutes).toBe(30000);

    // Update WITH new explicit allocatedMinutes
    const updated = await updateContract(
      context,
      contract.id,
      {
        validFrom: "2026-01-01",
        validTo: "2026-07-01",
        billingModel: "HOURLY",
        rate: "90",
        currency: "EUR",
        allocatedMinutes: "36000", // new explicit value 600h
      },
      runInTransaction,
    );

    expect(updated.allocatedMinutes).toBe(36000); // new explicit value applied
  });

  it("recalculates allocatedMinutes when existing was null and input not provided", async () => {
    const client = await createClient(
      context,
      {
        companyName: "Gamma Corp",
        email: "",
        phone: "",
        address: "",
        vatNumber: "",
        notes: "",
      },
      repositories.clients,
    );

    // Create with null allocatedMinutes (ongoing contract)
    const contract = await createContract(
      context,
      {
        clientId: client.id,
        validFrom: "2026-01-01",
        validTo: null, // ongoing
        billingModel: "HOURLY",
        rate: "85",
        currency: "EUR",
        monthlyContractedHours: "100",
        // allocatedMinutes null (derived as null for ongoing)
      },
      repositories.clients,
      repositories.contracts,
    );

    expect(contract.allocatedMinutes).toBeNull();

    // Update to finite contract - should derive allocatedMinutes
    const updated = await updateContract(
      context,
      contract.id,
      {
        validFrom: "2026-01-01",
        validTo: "2026-07-01", // now finite (6 months)
        billingModel: "HOURLY",
        rate: "85",
        currency: "EUR",
        monthlyContractedHours: "100",
        // allocatedMinutes not provided - should derive
      },
      runInTransaction,
    );

    expect(updated.allocatedMinutes).toBe(36000); // 6000min/month × 6 months = 36000
  });

  it("keeps null allocatedMinutes for ongoing contract without explicit budget", async () => {
    const client = await createClient(
      context,
      {
        companyName: "Delta Ltd",
        email: "",
        phone: "",
        address: "",
        vatNumber: "",
        notes: "",
      },
      repositories.clients,
    );

    const contract = await createContract(
      context,
      {
        clientId: client.id,
        validFrom: "2026-01-01",
        validTo: null, // ongoing
        billingModel: "HOURLY",
        rate: "95",
        currency: "EUR",
        monthlyContractedHours: "80",
      },
      repositories.clients,
      repositories.contracts,
    );

    expect(contract.allocatedMinutes).toBeNull();

    // Update ongoing contract without allocatedMinutes
    const updated = await updateContract(
      context,
      contract.id,
      {
        validFrom: "2026-01-01",
        validTo: null, // still ongoing
        billingModel: "HOURLY",
        rate: "100",
        currency: "EUR",
        monthlyContractedHours: "90",
      },
      runInTransaction,
    );

    expect(updated.allocatedMinutes).toBeNull(); // remains null for ongoing
  });
});
