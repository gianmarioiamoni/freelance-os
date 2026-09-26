// src/application/ai/ai-errors.ts
import type { AiRefusalClass } from "@/application/ai/ai-types";

export class InvalidAiQuestionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidAiQuestionError";
  }
}

export class InvalidAiToolError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidAiToolError";
  }
}

export type AiClarificationClass = Extract<
  AiRefusalClass,
  "ambiguous_entity" | "unknown_entity" | "invalid_period"
>;

export class AiClarificationError extends Error {
  readonly clarificationClass: AiClarificationClass;

  constructor(clarificationClass: AiClarificationClass, message?: string) {
    super(message ?? clarificationClass);
    this.name = "AiClarificationError";
    this.clarificationClass = clarificationClass;
  }
}
