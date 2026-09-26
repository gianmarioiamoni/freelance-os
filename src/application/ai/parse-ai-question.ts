// src/application/ai/parse-ai-question.ts
import { InvalidAiQuestionError } from "@/application/ai/ai-errors";
import { AI_QUESTION_MAX_LENGTH } from "@/application/ai/ai-types";

export function parseAiQuestion(question: string): string {
  if (typeof question !== "string") {
    throw new InvalidAiQuestionError("Question must be a string");
  }

  const trimmed = question.trim();
  if (trimmed.length === 0) {
    throw new InvalidAiQuestionError("Question is required");
  }

  if (trimmed.length > AI_QUESTION_MAX_LENGTH) {
    throw new InvalidAiQuestionError("Question exceeds maximum length");
  }

  return trimmed;
}
