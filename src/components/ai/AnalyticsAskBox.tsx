// src/components/ai/AnalyticsAskBox.tsx
"use client";

import type { AiAskResult, AiSurface } from "@/application/ai/ai-types";
import { AiOutcomePanel } from "@/components/ai/AiOutcomePanel";
import { GuidedPromptList } from "@/components/ai/GuidedPromptList";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { createAskActionInput } from "@/features/ai/create-ask-action-input";
import { askWorkspaceQuestionAction } from "@/features/ai/ask-workspace-question-action";
import {
  useId,
  useState,
  type FormEvent,
  type JSX,
  type KeyboardEvent,
} from "react";

type AnalyticsAskBoxProps = {
  surface: AiSurface;
};

export function AnalyticsAskBox({ surface }: AnalyticsAskBoxProps): JSX.Element {
  const questionId = useId();
  const [question, setQuestion] = useState("");
  const [validationMessage, setValidationMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<AiAskResult | null>(null);

  async function submitQuestion(nextQuestion: string): Promise<void> {
    const trimmed = nextQuestion.trim();
    if (trimmed.length === 0) {
      setValidationMessage("Enter a question.");
      return;
    }

    setValidationMessage(null);
    setIsSubmitting(true);
    try {
      const nextResult = await askWorkspaceQuestionAction(
        createAskActionInput(trimmed, surface),
      );
      setResult(nextResult);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    await submitQuestion(question);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>): void {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      if (!isSubmitting) {
        void submitQuestion(question);
      }
    }
  }

  return (
    <Card>
      <CardHeader>
        <h2 className="font-heading text-base leading-snug font-medium">
          Ask about your analytics
        </h2>
        <p className="text-sm text-muted-foreground">
          Ask a question about this workspace&apos;s available analytics data.
          AI does not calculate new totals.
        </p>
      </CardHeader>
      <CardContent className="grid gap-4">
        <GuidedPromptList
          disabled={isSubmitting}
          onPopulate={(nextQuestion) => {
            setQuestion(nextQuestion);
            setValidationMessage(null);
          }}
        />
        <form className="grid gap-3" onSubmit={handleSubmit}>
          <div className="grid gap-1">
            <Label htmlFor={questionId}>Question</Label>
            <textarea
              id={questionId}
              name="question"
              rows={3}
              value={question}
              disabled={isSubmitting}
              onChange={(event) => setQuestion(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about this month's analytics"
              className="w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-2 text-base outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 md:text-sm"
            />
          </div>
          {validationMessage ? (
            <p className="text-sm text-destructive" role="alert">
              {validationMessage}
            </p>
          ) : null}
          <div>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Asking…" : "Ask"}
            </Button>
          </div>
        </form>
        <div aria-live="polite" aria-busy={isSubmitting}>
          {isSubmitting ? (
            <p role="status">Asking…</p>
          ) : result ? (
            <AiOutcomePanel
              result={result}
              originalQuestion={question}
              onRetry={() => {
                void submitQuestion(question);
              }}
            />
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
