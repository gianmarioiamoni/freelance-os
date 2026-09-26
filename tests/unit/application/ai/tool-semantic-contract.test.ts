// tests/unit/application/ai/tool-semantic-contract.test.ts
import { describe, expect, it } from "vitest";

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
    expect(byName.get_hours_by_client).toMatch(/owns hours-by-client user-intent/i);
  });

  it("discriminates contract entity list from contract analytics report", () => {
    const byName = descriptions();

    expect(byName.list_contracts).toMatch(/entity list, not analytics/i);
    expect(byName.list_contracts).toMatch(/not a substitute for get_contract_report/i);
    expect(byName.get_contract_report).toMatch(/analytics report, not a commercial contract entity list/i);
    expect(byName.get_contract_report).toMatch(/not a substitute for list_contracts/i);
    expect(`${byName.list_contracts} ${byName.get_contract_report}`).not.toMatch(
      /attenzione|fatture scadute/,
    );
  });

  it("marks list tools as entity reads, not analytics or collection indexes", () => {
    const byName = descriptions();

    expect(byName.list_clients).toMatch(/entity list, not analytics/i);
    expect(byName.list_clients).toMatch(/does not report invoices, payments, collections/i);
    expect(byName.list_invoices_for_contract).toMatch(/workspace-wide invoice.*unsupported/i);
  });
});
