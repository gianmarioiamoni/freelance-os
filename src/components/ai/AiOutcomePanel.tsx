// src/components/ai/AiOutcomePanel.tsx
import type { AiAskResult } from "@/application/ai/ai-types";
import { aiOutcomeCopy } from "@/components/ai/ai-outcome-copy";
import {
  formatFactForDisplay,
  formatMetricLabel,
} from "@/components/ai/format-ai-citations";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import type { JSX } from "react";

type AiOutcomePanelProps = {
  result: AiAskResult;
  onRetry?: () => void;
};

export function AiOutcomePanel({
  result,
  onRetry,
}: AiOutcomePanelProps): JSX.Element {
  const copy = aiOutcomeCopy(result);

  if (result.outcome === "success") {
    const visibleFacts = result.facts.filter(
      (fact) => fact.value !== 0 && fact.value !== null,
    );

    return (
      <div className="grid gap-3" role="status" aria-label="AI answer">
        <p>{result.text}</p>
        {visibleFacts.length > 0 ? (
          <ul className="grid gap-1 text-sm">
            {visibleFacts.map((fact, index) => (
              <li key={`${fact.metric}-${index}`}>
                {formatMetricLabel(fact.metric)}
                {fact.label ? ` (${fact.label})` : ""}: {formatFactForDisplay(fact)}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    );
  }

  return (
    <Alert
      variant={result.outcome === "error" || result.outcome === "timeout" ? "destructive" : "default"}
    >
      <AlertTitle>{copy.title}</AlertTitle>
      <AlertDescription>{copy.description}</AlertDescription>
      {copy.canRetry && onRetry ? (
        <div className="pt-2">
          <Button type="button" variant="outline" size="sm" onClick={onRetry}>
            Try again
          </Button>
        </div>
      ) : null}
    </Alert>
  );
}
