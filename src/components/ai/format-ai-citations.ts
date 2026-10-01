// src/components/ai/format-ai-citations.ts
import type { AiCitation, AiGroundedFact } from "@/application/ai/ai-types";

export function displayFactValue(fact: AiGroundedFact): string {
  if (fact.value === null) {
    return "Not available";
  }
  if (fact.currency) {
    return `${fact.value} ${fact.currency}`;
  }
  if (fact.unit) {
    return `${fact.value} ${fact.unit}`;
  }
  return String(fact.value);
}

export function formatFactForDisplay(fact: AiGroundedFact): string {
  if (fact.value === null) {
    return "Not available";
  }

  if (fact.unit === "minutes") {
    const minutes = fact.value as number;
    const hours = Math.round(minutes / 60);
    return `${hours}h`;
  }

  if (fact.currency) {
    return `${fact.value} ${fact.currency}`;
  }

  return String(fact.value);
}

export function formatMetricLabel(metric: string): string {
  const labels: Record<string, string> = {
    hours: "Hours worked",
    billableHours: "Billable hours",
    accrued: "Accrued revenue",
    expected: "Expected revenue",
    forecast: "Forecast",
    clientHours: "Client hours",
    contractHours: "Contract hours",
    utilizationPercentage: "Utilization",
    invoiceAmount: "Invoice amount",
    invoicePaid: "Paid amount",
    paymentAmount: "Payment",
  };
  return labels[metric] || metric;
}

export function citationIdentity(citation: AiCitation): string | undefined {
  return citation.contractLabel ?? citation.clientLabel;
}

export function citationPeriodLabel(citation: AiCitation): string | undefined {
  if (!citation.period) {
    return undefined;
  }
  return `${citation.period.startDate} – ${citation.period.endDate}`;
}
