// src/features/landing/capabilities.ts
export const LANDING_CAPABILITIES = [
  {
    title: "Clients",
    description: "Create and manage client companies, including archive.",
    detail:
      "Clients are company records in your workspace. Active clients are the ones you work with; archived clients remain available for history without appearing in the active list.",
  },
  {
    title: "Contracts",
    description:
      "Record contract validity, rates, and monthly hours per client.",
    detail:
      "Each contract belongs to a client and has a validity period, a rate, and optional monthly contracted hours. Time entries and utilization use the contract that was valid on the work date.",
  },
  {
    title: "Time Tracking",
    description: "Log billable and non-billable time against a valid contract.",
    detail:
      "Log time against a valid contract as billable or non-billable. Duration is recorded in minutes. Changing a contract later does not rewrite historical entries.",
  },
  {
    title: "Analytics / Dashboard",
    description:
      "See this month's hours, client allocation, and contract utilization.",
    detail:
      "The dashboard shows this month's tracked hours, billable and non-billable activity, how time is allocated across clients, and how much of each contract's monthly hours is used.",
  },
  {
    title: "Reports",
    description: "Review hours and contract utilization by selected period.",
    detail:
      "Reports cover selectable periods such as today, this week, this month, or this year. They show hours and contract utilization using the workspace timezone.",
  },
  {
    title: "Alerts",
    description:
      "In-app warnings when contracts approach or exceed monthly hours.",
    detail:
      "In-app alerts fire when a contract approaches its monthly hours (default 80%) or exceeds them. They appear in the notification center and can be marked as read.",
  },
] as const;

export type LandingCapability = (typeof LANDING_CAPABILITIES)[number];
