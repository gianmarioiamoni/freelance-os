// src/features/landing/capabilities.ts
export const LANDING_CAPABILITIES = [
  {
    title: "Clients",
    description: "Create and manage client companies, including archive.",
  },
  {
    title: "Contracts",
    description:
      "Record contract validity, rates, and monthly hours per client.",
  },
  {
    title: "Time Tracking",
    description: "Log billable and non-billable time against a valid contract.",
  },
  {
    title: "Analytics / Dashboard",
    description:
      "See this month's hours, client allocation, and contract utilization.",
  },
  {
    title: "Reports",
    description: "Review hours and contract utilization by selected period.",
  },
  {
    title: "Alerts",
    description:
      "In-app warnings when contracts approach or exceed monthly hours.",
  },
] as const;
