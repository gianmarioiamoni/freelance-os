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

export function citationIdentity(citation: AiCitation): string | undefined {
  return citation.contractLabel ?? citation.clientLabel;
}

export function citationPeriodLabel(citation: AiCitation): string | undefined {
  if (!citation.period) {
    return undefined;
  }
  return `${citation.period.startDate} – ${citation.period.endDate}`;
}
