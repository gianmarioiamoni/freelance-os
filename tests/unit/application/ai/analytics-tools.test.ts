// tests/unit/application/ai/analytics-tools.test.ts
import { describe, expect, it } from "vitest";

import { createAnalyticsToolRegistry } from "@/application/ai/create-analytics-registry";
import { ClientNotFoundError } from "@/domain/client-errors";

import { stubAnalyticsServices, workspaceContext } from "./ai-test-helpers";

describe("analytics read tools", () => {
  it("registers only read-only tools without tenant arguments", () => {
    const registry = createAnalyticsToolRegistry(stubAnalyticsServices());
    const serialized = JSON.stringify(registry.descriptors());

    expect(registry.names().length).toBeGreaterThan(8);
    expect(registry.names()).toContain("refuse");
    expect(serialized).not.toMatch(/workspaceId|userId|"role"/);
    for (const name of registry.names()) {
      expect(registry.get(name)?.readOnly).toBe(true);
    }
  });

  it("does not execute an application service when refuse is invoked directly", async () => {
    const registry = createAnalyticsToolRegistry(stubAnalyticsServices());

    await expect(
      registry.get("refuse")?.execute(workspaceContext(), { class: "unsupported_capability" }),
    ).rejects.toThrow(/must not execute/);
  });

  it("binds the trusted workspace context on every implemented tool", async () => {
    const captured: { context?: ReturnType<typeof workspaceContext> } = {};
    const services = stubAnalyticsServices({}, captured);
    const registry = createAnalyticsToolRegistry(services);
    const context = workspaceContext();

    await registry.get("get_accrued_revenue")?.execute(context, { periodKind: "month" });
    expect(captured.context).toEqual(context);

    await registry.get("get_hours_by_client")?.execute(context, {});
    expect(captured.context).toEqual(context);

    await registry.get("list_contract_allocations")?.execute(context, {});
    expect(captured.context).toEqual(context);
  });

  it("cannot inject a client id that getClient rejects", async () => {
    const registry = createAnalyticsToolRegistry(
      stubAnalyticsServices({
        getClient: async () => {
          throw new ClientNotFoundError();
        },
      }),
    );

    await expect(
      registry.get("get_accrued_revenue")?.execute(workspaceContext(), {
        periodKind: "month",
        clientId: "forged-client",
      }),
    ).rejects.toBeInstanceOf(ClientNotFoundError);
  });

  it("attaches a safe client label to allocations and omits contract ids", async () => {
    const registry = createAnalyticsToolRegistry(stubAnalyticsServices());
    const listed = await registry.get("list_contract_allocations")?.execute(
      workspaceContext(),
      {},
    );
    const single = await registry.get("get_contract_allocation")?.execute(
      workspaceContext(),
      { contractId: "contract-1" },
    );
    const report = await registry.get("get_contract_report")?.execute(
      workspaceContext(),
      { periodKind: "month" },
    );

    expect(listed).toMatchObject({ allocations: [expect.objectContaining({ clientName: "ACME" })] });
    expect(single).toMatchObject({ clientName: "ACME" });
    expect(report).toMatchObject({
      contractAllocations: [expect.objectContaining({ clientName: "ACME" })],
    });
    expect(JSON.stringify({ listed, single, report })).not.toContain("contract-1");
  });

  it("omits contract notes and workspace ids from minimized DTOs", async () => {
    const registry = createAnalyticsToolRegistry(stubAnalyticsServices());
    const result = await registry.get("get_contract")?.execute(workspaceContext(), {
      contractId: "contract-1",
    });

    expect(JSON.stringify(result)).not.toContain("secret note");
    expect(JSON.stringify(result)).not.toContain("workspace-owned");
    expect(JSON.stringify(result)).not.toContain("paymentTermsNote");
  });

  it("returns a null Forecast DTO for a historical period", async () => {
    const registry = createAnalyticsToolRegistry(
      stubAnalyticsServices({
        getForecastRevenue: async () => null,
      }),
    );

    const result = await registry.get("get_forecast_revenue")?.execute(workspaceContext(), {
      periodKind: "custom",
      startDate: "2025-01-01",
      endDate: "2025-01-31",
    });

    expect(result).toMatchObject({ unavailable: true, byCurrency: [] });
  });
});
