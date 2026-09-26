// tests/unit/application/ai/tool-semantic-contract.test.ts
import { describe, expect, it } from "vitest";

import { AI_CAPABILITY_OWNERS } from "@/application/ai/capability-catalog";
import { createAnalyticsToolRegistry } from "@/application/ai/create-analytics-registry";

import { stubAnalyticsServices } from "./ai-test-helpers";

function descriptions(): Record<string, string> {
  return Object.fromEntries(
    createAnalyticsToolRegistry(stubAnalyticsServices()).descriptors().map((tool) => [
      tool.name,
      tool.description,
    ]),
  );
}

describe("tool catalog semantic exclusivity", () => {
  it("marks overview tools as not substitutes for specialized metrics", () => {
    const byName = descriptions();

    expect(byName.get_current_month_analytics).toMatch(/not a substitute for specialized metric/i);
    expect(byName.get_monthly_analytics).toMatch(/not a substitute for specialized metric/i);
    expect(byName.get_accrued_revenue).toMatch(/owns accrued revenue user-intent/i);
    expect(byName.get_expected_revenue).toMatch(/owns expected revenue user-intent/i);
    expect(byName.get_forecast_revenue).toMatch(/owns forecast revenue user-intent/i);
    expect(byName.get_hours_by_client).toMatch(/owns hours grouped by client/i);
  });

  it("binds implicit current-month hours to the zero-arg overview", () => {
    const byName = descriptions();

    expect(AI_CAPABILITY_OWNERS.hours_total_current_period).toBe("get_current_month_analytics");
    expect(byName.get_current_month_analytics).toMatch(/implicit current-month hours/i);
    expect(byName.get_current_month_analytics).toMatch(/questo mese hours and briefing only/i);
    expect(byName.get_monthly_analytics).toMatch(/must not select for implicit current-month hours/i);
    expect(byName.get_monthly_analytics).toMatch(/periodKind=month is not a substitute/i);
    expect(byName.get_monthly_analytics.toLowerCase().startsWith("owns an explicit-period")).toBe(
      true,
    );
  });

  it("does not let questo mese override a named revenue metric", () => {
    const byName = descriptions();

    expect(byName.get_current_month_analytics).toMatch(
      /must not select when the question names Accrued, Expected, Forecast, or maturato/i,
    );
    expect(byName.get_current_month_analytics).toMatch(/even if it contains questo mese/i);
    expect(byName.get_accrued_revenue).toMatch(/owns accrued revenue user-intent/i);
    expect(byName.get_accrued_revenue).toMatch(/Italian maturato is Accrued/);
    expect(byName.get_expected_revenue).toMatch(/owns expected revenue user-intent/i);
    expect(byName.get_forecast_revenue).toMatch(/owns forecast revenue user-intent/i);
    expect(byName.get_expected_revenue).not.toMatch(/maturato/);
    expect(byName.get_forecast_revenue).not.toMatch(/maturato/);
  });

  it("binds hours distribution to get_hours_by_client only", () => {
    const byName = descriptions();

    expect(AI_CAPABILITY_OWNERS.hours_by_client).toBe("get_hours_by_client");
    expect(byName.get_hours_by_client).toMatch(/Come sono distribuite le mie ore/);
    expect(byName.get_hours_by_client).toMatch(/optional filters/i);
    expect(byName.get_current_month_analytics).toMatch(/does not own hours grouped by client/i);
    expect(byName.get_monthly_analytics).toMatch(/does not own hours grouped by client/i);
  });

  it("discriminates contract entity list from contract analytics report", () => {
    const byName = descriptions();

    expect(byName.list_contracts).toMatch(/entity list, not analytics/i);
    expect(byName.list_contracts).toMatch(/not a substitute for get_contract_report/i);
    expect(byName.get_contract_report).toMatch(/analytics report, not a commercial contract entity list/i);
    expect(byName.get_contract_report).toMatch(/not a substitute for list_contracts/i);
    expect(byName.list_contracts).not.toMatch(/fatture scadute/);
  });

  it("binds attenzione to utilization pressure on get_contract_report", () => {
    const byName = descriptions();

    expect(AI_CAPABILITY_OWNERS.contract_attention).toBe("get_contract_report");
    expect(byName.get_contract_report).toMatch(/attenzione/);
    expect(byName.get_contract_report).toMatch(/Quali contratti richiedono attenzione/);
    expect(byName.get_contract_report).toMatch(/allocation pressure/i);
    expect(byName.list_contract_allocations).toMatch(/remaining minutes/i);
    expect(byName.list_contract_allocations).toMatch(/not Italian attenzione/i);
    expect(byName.list_contract_allocations).toMatch(/consumo rapido/);
  });

  it("binds the GP-09 consumption chip to list_contract_allocations", () => {
    const byName = descriptions();
    const gp09 = "Quali contratti stanno consumando più rapidamente l'allocazione";

    expect(AI_CAPABILITY_OWNERS.contract_allocation_status).toBe("list_contract_allocations");
    expect(byName.list_contract_allocations).toContain(gp09);
    expect(byName.get_contract_report).toContain(gp09);
    expect(byName.get_contract_report).toMatch(new RegExp(`Not remaining minutes.*${gp09}`));
    expect(byName.list_contract_allocations).toMatch(/not Italian attenzione/i);
    expect(byName.get_contract_report).toMatch(/Quali contratti richiedono attenzione/);
  });

  it("exposes a native refuse sentinel without application reads", () => {
    const byName = descriptions();

    expect(byName.refuse).toMatch(/native refusal sentinel/i);
    expect(byName.refuse).toMatch(/unsupported_capability/);
    expect(byName.refuse).toMatch(/write_forbidden/);
    expect(byName.refuse).toMatch(/injection/);
    expect(byName.refuse).toMatch(/executes no application read or write/i);
  });

  it("marks list tools as entity reads, not analytics or collection indexes", () => {
    const byName = descriptions();

    expect(byName.list_clients).toMatch(/entity list, not analytics/i);
    expect(byName.list_clients).toMatch(/does not report invoices, payments, collections/i);
    expect(byName.list_invoices_for_contract).toMatch(/workspace-wide invoice.*unsupported/i);
  });
});
