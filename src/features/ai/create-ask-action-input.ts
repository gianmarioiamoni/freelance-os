// src/features/ai/create-ask-action-input.ts
import type { AiAskInput, AiSurface } from "@/application/ai/ai-types";

export function createAskActionInput(
  question: string,
  surface: AiSurface,
): AiAskInput {
  return { question, surface };
}
