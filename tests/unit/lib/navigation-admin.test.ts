// tests/unit/lib/navigation-admin.test.ts
import { buildNavigationItems } from "@/lib/navigation";
import { describe, expect, it } from "vitest";

describe("buildNavigationItems - Admin visibility", () => {
  it("hides the Admin item for normal users", () => {
    const items = buildNavigationItems(0, false);

    expect(items.find((item) => item.href === "/admin")).toBeUndefined();
    expect(items.some((item) => item.label === "Admin")).toBe(false);
  });

  it("shows the Admin item for the configured Admin", () => {
    const items = buildNavigationItems(0, true);
    const adminItem = items.find((item) => item.href === "/admin");

    expect(adminItem).toEqual(
      expect.objectContaining({
        href: "/admin",
        label: "Admin",
      }),
    );
  });
});
