// @vitest-environment jsdom
// tests/unit/features/timesheet-viewer/timesheet-viewer-navigation.test.tsx
import { render, screen } from "@testing-library/react";
import { AppNav } from "@/components/app-shell/AppNav";
import { describe, it, expect, vi } from "vitest";

vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard",
}));

describe("Timesheet Viewer Navigation", () => {
  it("should render Timesheet Viewer link in navigation", () => {
    render(<AppNav unreadAlertCount={0} isAdmin={false} />);
    
    const viewerLink = screen.getByRole("link", { 
      name: /timesheet viewer/i 
    });
    
    expect(viewerLink).toBeInTheDocument();
    expect(viewerLink).toHaveAttribute("href", "/timesheet-viewer");
  });

  it("should render Timesheet Viewer link for non-admin users", () => {
    render(<AppNav unreadAlertCount={0} isAdmin={false} />);
    
    expect(
      screen.getByRole("link", { name: /timesheet viewer/i })
    ).toBeInTheDocument();
  });

  it("should render Timesheet Viewer link for admin users", () => {
    render(<AppNav unreadAlertCount={0} isAdmin={true} />);
    
    expect(
      screen.getByRole("link", { name: /timesheet viewer/i })
    ).toBeInTheDocument();
  });
});
