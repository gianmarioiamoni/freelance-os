// tests/unit/lib/navigation.test.ts
import {
  buildNavigationItems,
  isNavigationItemActive,
} from "@/lib/navigation";
import { describe, expect, it } from "vitest";

describe("buildNavigationItems - Invoices", () => {
  it("includes Invoices for authenticated workspace users", () => {
    const items = buildNavigationItems(0, false);
    const invoices = items.find((item) => item.label === "Invoices");

    expect(invoices).toEqual(
      expect.objectContaining({
        href: "/invoices",
        label: "Invoices",
      }),
    );
  });

  it("places Invoices after Reports and before Alerts", () => {
    const hrefs = buildNavigationItems(0, false).map((item) => item.href);
    const reportsIndex = hrefs.indexOf("/reports");
    const invoicesIndex = hrefs.indexOf("/invoices");
    const alertsIndex = hrefs.indexOf("/alerts");

    expect(invoicesIndex).toBe(reportsIndex + 1);
    expect(alertsIndex).toBe(invoicesIndex + 1);
  });
});

describe("isNavigationItemActive", () => {
  it("should treat only the dashboard path as the dashboard", () => {
    expect(isNavigationItemActive("/dashboard", "/dashboard")).toBe(true);
    expect(isNavigationItemActive("/", "/dashboard")).toBe(false);
    expect(isNavigationItemActive("/clients", "/dashboard")).toBe(false);
  });

  it("should treat a section path and its nested routes as active", () => {
    expect(isNavigationItemActive("/clients", "/clients")).toBe(true);
    expect(isNavigationItemActive("/clients/acme", "/clients")).toBe(true);
  });

  it("should not treat a sibling section as active", () => {
    expect(isNavigationItemActive("/contracts", "/clients")).toBe(false);
  });

  it("should mark /invoices as active for the Invoices item", () => {
    expect(isNavigationItemActive("/invoices", "/invoices")).toBe(true);
  });

  it("should keep Contracts active on nested invoice detail and payment routes", () => {
    const invoiceDetail = "/contracts/contract-1/invoices/invoice-1";
    const paymentRoute =
      "/contracts/contract-1/invoices/invoice-1/payments/new";

    expect(isNavigationItemActive(invoiceDetail, "/contracts")).toBe(true);
    expect(isNavigationItemActive(paymentRoute, "/contracts")).toBe(true);
    expect(isNavigationItemActive(invoiceDetail, "/invoices")).toBe(false);
    expect(isNavigationItemActive(paymentRoute, "/invoices")).toBe(false);
  });
});
