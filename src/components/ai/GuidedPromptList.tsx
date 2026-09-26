// src/components/ai/GuidedPromptList.tsx
"use client";

import { Button } from "@/components/ui/button";
import {
  additionalGuidedPrompts,
  populateAskBox,
  visibleGuidedPrompts,
  type GuidedPromptDefinition,
} from "@/features/ai/guided-prompt-catalog";
import type { JSX } from "react";

type GuidedPromptListProps = {
  disabled?: boolean;
  onPopulate: (question: string) => void;
};

function PromptChip({
  prompt,
  disabled,
  onPopulate,
}: {
  prompt: GuidedPromptDefinition;
  disabled?: boolean;
  onPopulate: (question: string) => void;
}): JSX.Element {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={disabled}
      onClick={() => onPopulate(populateAskBox(prompt.text))}
    >
      {prompt.text}
    </Button>
  );
}

export function GuidedPromptList({
  disabled,
  onPopulate,
}: GuidedPromptListProps): JSX.Element {
  const visible = visibleGuidedPrompts();
  const additional = additionalGuidedPrompts();

  return (
    <div className="grid gap-2">
      <p className="text-sm text-muted-foreground">
        Suggestions fill the question. They are not sent until you submit.
      </p>
      <div className="flex flex-wrap gap-2">
        {visible.map((prompt) => (
          <PromptChip
            key={prompt.id}
            prompt={prompt}
            disabled={disabled}
            onPopulate={onPopulate}
          />
        ))}
      </div>
      {additional.length > 0 ? (
        <details className="grid gap-2">
          <summary className="cursor-pointer text-sm font-medium">
            More questions
          </summary>
          <div className="flex flex-wrap gap-2">
            {additional.map((prompt) => (
              <PromptChip
                key={prompt.id}
                prompt={prompt}
                disabled={disabled}
                onPopulate={onPopulate}
              />
            ))}
          </div>
        </details>
      ) : null}
    </div>
  );
}
