// tests/unit/lib/navigation.test.ts
import { isNavigationItemActive } from "@/lib/navigation";
import { describe, expect, it } from "vitest";

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
});
