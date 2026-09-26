// src/application/ai/ai-errors.ts

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
