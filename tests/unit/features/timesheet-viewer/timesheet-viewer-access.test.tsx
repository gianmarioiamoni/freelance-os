// @vitest-environment jsdom
// tests/unit/features/timesheet-viewer/timesheet-viewer-access.test.tsx
import { render, screen } from "@testing-library/react";
import { InviteViewerForm } from "@/features/timesheet-viewer/InviteViewerForm";
import { ViewerAccessList } from "@/features/timesheet-viewer/ViewerAccessList";
import { describe, it, expect, vi } from "vitest";

describe("Timesheet Viewer Access", () => {
  describe("InviteViewerForm", () => {
    it("should render invite form with email input", () => {
      render(<InviteViewerForm />);

      expect(screen.getByLabelText(/viewer email/i)).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /invite viewer/i })
      ).toBeInTheDocument();
    });

    it("should display email integration disclaimer", async () => {
      render(<InviteViewerForm />);

      const disclaimer = screen.queryByText(/email service is not yet implemented/i);
      expect(disclaimer).not.toBeInTheDocument();
    });
  });

  describe("ViewerAccessList", () => {
    it("should display message when no viewers exist", () => {
      render(<ViewerAccessList viewers={[]} />);

      expect(
        screen.getByText(/no viewers have been invited yet/i)
      ).toBeInTheDocument();
    });

    it("should display viewer list with actions", () => {
      const viewers = [
        {
          id: "viewer-1",
          email: "viewer@example.com",
          status: "ACTIVE",
          userId: "user-1",
          createdAt: new Date("2024-01-01"),
          revokedAt: null,
        },
      ];

      render(<ViewerAccessList viewers={viewers} />);

      expect(screen.getByText("viewer@example.com")).toBeInTheDocument();
      expect(screen.getByText("ACTIVE")).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /revoke/i })
      ).toBeInTheDocument();
    });

    it("should display manage contracts button for active viewers", () => {
      const viewers = [
        {
          id: "viewer-1",
          email: "viewer@example.com",
          status: "ACTIVE",
          userId: "user-1",
          createdAt: new Date("2024-01-01"),
          revokedAt: null,
        },
      ];

      const onManageContracts = vi.fn();
      render(
        <ViewerAccessList 
          viewers={viewers} 
          onManageContracts={onManageContracts} 
        />
      );

      expect(
        screen.getByRole("button", { name: /manage contracts/i })
      ).toBeInTheDocument();
    });
  });
});
