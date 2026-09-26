// src/application/ai/parse-ai-surface.ts
import { InvalidAiQuestionError } from "@/application/ai/ai-errors";
import { AI_SURFACES, type AiSurface } from "@/application/ai/ai-types";

export function parseAiSurface(surface: unknown): AiSurface {
  if (
    typeof surface === "string" &&
    (AI_SURFACES as readonly string[]).includes(surface)
  ) {
    return surface as AiSurface;
  }

  throw new InvalidAiQuestionError("Surface is invalid");
}
