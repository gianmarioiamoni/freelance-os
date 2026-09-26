// src/components/ai/AiOutcomePanel.tsx
import type { AiAskResult } from "@/application/ai/ai-types";
import { aiOutcomeCopy } from "@/components/ai/ai-outcome-copy";
import {
  citationIdentity,
  citationPeriodLabel,
  displayFactValue,
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
    return (
      <div className="grid gap-3" role="status" aria-label="AI answer">
        <p>{result.text}</p>
        {result.facts.length > 0 ? (
          <ul className="grid gap-1 text-sm">
            {result.facts.map((fact, index) => (
              <li key={`${fact.metric}-${index}`}>
                {fact.label ? `${fact.metric} (${fact.label})` : fact.metric}:{" "}
                {displayFactValue(fact)}
              </li>
            ))}
          </ul>
        ) : null}
        {result.citations.length > 0 ? (
          <section aria-labelledby="ai-citations-heading" className="grid gap-1">
            <h3 id="ai-citations-heading" className="text-sm font-medium">
              Sources
            </h3>
            <ul className="grid gap-1 text-sm text-muted-foreground">
              {result.citations.map((citation, index) => {
                const identity = citationIdentity(citation);
                const period = citationPeriodLabel(citation);
                return (
                  <li key={`${citation.tool}-${citation.metric}-${index}`}>
                    {citation.metric}
                    {identity ? ` · ${identity}` : ""}
                    {period ? ` · ${period}` : ""}
                    {`: ${displayFactValue(citation)}`}
                  </li>
                );
              })}
            </ul>
          </section>
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
