/**
 * P1-02: Time Tracking view selector
 * Verify that the view selector buttons reflect the current URL-derived view state.
 */
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import TimeTrackingPage from "@/app/(app)/time-tracking/page";

// Mock Next.js modules
vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock("@/features/time-entries/TimeEntryList", () => ({
  TimeEntryList: () => <div data-testid="time-entry-list">Daily List</div>,
}));

vi.mock("@/features/time-entries/WeeklyTimesheet", () => ({
  WeeklyTimesheet: () => <div data-testid="weekly-timesheet">Weekly Sheet</div>,
}));

vi.mock("@/features/time-entries/attach-time-entry-details", () => ({
  attachTimeEntryDetails: vi.fn((entries) => entries),
}));

vi.mock("@/features/time-entries/load-time-entries", () => ({
  loadTimeEntriesForDate: vi.fn().mockResolvedValue([]),
  loadTimeEntriesForWeek: vi.fn().mockResolvedValue([]),
  loadClientsAndContracts: vi.fn().mockResolvedValue({ clients: [], contracts: [] }),
}));

describe("Time Tracking view selector (P1-02)", () => {
  describe("daily view", () => {
    it("renders daily view with Daily button as active (default variant)", async () => {
      const page = await TimeTrackingPage({
        searchParams: Promise.resolve({ date: "2026-10-15" }),
      });

      const { container } = render(page);

      // Check that daily view component is rendered
      expect(screen.getByTestId("time-entry-list")).toBeDefined();

      // Find the view selector section
      const viewButtons = container.querySelectorAll('a[href*="date"], span');
      const dailyButton = Array.from(viewButtons).find(
        (btn) => btn.textContent === "Daily"
      );
      const weeklyButton = Array.from(viewButtons).find(
        (btn) => btn.textContent === "Weekly"
      );

      // Daily should be a span (active state, non-clickable)
      expect(dailyButton?.tagName).toBe("SPAN");
      
      // Weekly should be a link (inactive state, clickable)
      expect(weeklyButton?.tagName).toBe("A");
    });

    it("renders default (no view param) as daily view with Daily active", async () => {
      const page = await TimeTrackingPage({
        searchParams: Promise.resolve({}),
      });

      const { container } = render(page);

      expect(screen.getByTestId("time-entry-list")).toBeDefined();

      const viewButtons = container.querySelectorAll('a[href*="date"], span');
      const dailyButton = Array.from(viewButtons).find(
        (btn) => btn.textContent === "Daily"
      );

      expect(dailyButton?.tagName).toBe("SPAN");
    });
  });

  describe("weekly view", () => {
    it("renders weekly view with Weekly button as active (default variant)", async () => {
      const page = await TimeTrackingPage({
        searchParams: Promise.resolve({ view: "week", start: "2026-10-07" }),
      });

      const { container } = render(page);

      // Check that weekly view component is rendered
      expect(screen.getByTestId("weekly-timesheet")).toBeDefined();

      // Find the view selector section
      const viewButtons = container.querySelectorAll('a[href*="view"], span');
      const dailyButton = Array.from(viewButtons).find(
        (btn) => btn.textContent === "Daily"
      );
      const weeklyButton = Array.from(viewButtons).find(
        (btn) => btn.textContent === "Weekly"
      );

      // Weekly should be a span (active state, non-clickable)
      expect(weeklyButton?.tagName).toBe("SPAN");
      
      // Daily should be a link (inactive state, clickable)
      expect(dailyButton?.tagName).toBe("A");
    });
  });

  describe("view state transitions", () => {
    it("daily → weekly: changes active button from Daily to Weekly", async () => {
      // First render daily
      const dailyPage = await TimeTrackingPage({
        searchParams: Promise.resolve({ date: "2026-10-15" }),
      });
      const { container: dailyContainer } = render(dailyPage);
      
      const dailyButtons = dailyContainer.querySelectorAll('a, span');
      const dailyActive = Array.from(dailyButtons).find(
        (btn) => btn.textContent === "Daily" && btn.tagName === "SPAN"
      );
      expect(dailyActive).toBeDefined();

      // Then render weekly
      const weeklyPage = await TimeTrackingPage({
        searchParams: Promise.resolve({ view: "week", start: "2026-10-07" }),
      });
      const { container: weeklyContainer } = render(weeklyPage);
      
      const weeklyButtons = weeklyContainer.querySelectorAll('a, span');
      const weeklyActive = Array.from(weeklyButtons).find(
        (btn) => btn.textContent === "Weekly" && btn.tagName === "SPAN"
      );
      expect(weeklyActive).toBeDefined();
    });

    it("weekly → daily: changes active button from Weekly to Daily", async () => {
      // First render weekly
      const weeklyPage = await TimeTrackingPage({
        searchParams: Promise.resolve({ view: "week", start: "2026-10-07" }),
      });
      const { container: weeklyContainer } = render(weeklyPage);
      
      const weeklyButtons = weeklyContainer.querySelectorAll('a, span');
      const weeklyActive = Array.from(weeklyButtons).find(
        (btn) => btn.textContent === "Weekly" && btn.tagName === "SPAN"
      );
      expect(weeklyActive).toBeDefined();

      // Then render daily
      const dailyPage = await TimeTrackingPage({
        searchParams: Promise.resolve({ date: "2026-10-15" }),
      });
      const { container: dailyContainer } = render(dailyPage);
      
      const dailyButtons = dailyContainer.querySelectorAll('a, span');
      const dailyActive = Array.from(dailyButtons).find(
        (btn) => btn.textContent === "Daily" && btn.tagName === "SPAN"
      );
      expect(dailyActive).toBeDefined();
    });
  });

  describe("URL as source of truth", () => {
    it("view state is determined by searchParams, not client state", async () => {
      // Daily view from URL
      const dailyPage = await TimeTrackingPage({
        searchParams: Promise.resolve({ date: "2026-10-15" }),
      });
      const { container: dailyContainer } = render(dailyPage);
      expect(screen.getByTestId("time-entry-list")).toBeDefined();

      // Weekly view from URL (different render)
      const weeklyPage = await TimeTrackingPage({
        searchParams: Promise.resolve({ view: "week" }),
      });
      const { container: weeklyContainer } = render(weeklyPage);
      expect(screen.getByTestId("weekly-timesheet")).toBeDefined();
    });
  });
});
