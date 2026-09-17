// tests/unit/lib/navigation-badge.test.ts
import { buildNavigationItems } from "@/lib/navigation";
import { describe, expect, it } from "vitest";

describe("buildNavigationItems - unread alerts badge", () => {
  it("alerts item has no badge when unread count is 0", () => {
    const items = buildNavigationItems(0);
    const alerts = items.find((i) => i.href === "/alerts");
    expect(alerts?.badge).toBeUndefined();
  });

  it("alerts item has badge equal to unread count when count > 0", () => {
    const items = buildNavigationItems(3);
    const alerts = items.find((i) => i.href === "/alerts");
    expect(alerts?.badge).toBe(3);
  });

  it("non-alerts items never have a badge regardless of count", () => {
    const items = buildNavigationItems(5);
    const others = items.filter((i) => i.href !== "/alerts");
    for (const item of others) {
      expect(item.badge).toBeUndefined();
    }
  });

  it("alerts item badge reflects exact unread count", () => {
    expect(buildNavigationItems(1).find((i) => i.href === "/alerts")?.badge).toBe(1);
    expect(buildNavigationItems(99).find((i) => i.href === "/alerts")?.badge).toBe(99);
    expect(buildNavigationItems(100).find((i) => i.href === "/alerts")?.badge).toBe(100);
  });
});
