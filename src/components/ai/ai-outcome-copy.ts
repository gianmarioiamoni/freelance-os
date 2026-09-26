// src/components/ai/ai-outcome-copy.ts
import type { AiAskResult, AiRefusalClass } from "@/application/ai/ai-types";
import { GUIDED_PROMPT_CATEGORIES } from "@/features/ai/guided-prompt-catalog";

export type AiOutcomeCopy = {
  title: string;
  description: string;
  canRetry: boolean;
};

const CLARIFICATION_COPY: Record<
  Extract<AiRefusalClass, "ambiguous_entity" | "unknown_entity" | "invalid_period">,
  string
> = {
  ambiguous_entity:
    "More than one client matches that name. Specify which client you mean.",
  unknown_entity: "That client or contract was not found. Check the name and try again.",
  invalid_period: "That period is not valid for the current analytics reads.",
};

const REFUSAL_COPY: Record<
  Extract<AiRefusalClass, "unsupported_capability" | "write_forbidden" | "injection">,
  string
> = {
  unsupported_capability: `That question is not supported. You can ask about ${GUIDED_PROMPT_CATEGORIES.join(", ").toLowerCase()}.`,
  write_forbidden: "AI cannot make changes. It can only explain existing analytics.",
  injection: "That request is not supported.",
};

export function aiOutcomeCopy(result: Pick<AiAskResult, "outcome" | "refusalClass">): AiOutcomeCopy {
  if (result.outcome === "success") {
    return { title: "Answer", description: "", canRetry: false };
  }

  if (result.outcome === "clarification") {
    const description =
      result.refusalClass === "ambiguous_entity" ||
      result.refusalClass === "unknown_entity" ||
      result.refusalClass === "invalid_period"
        ? CLARIFICATION_COPY[result.refusalClass]
        : "This question needs more detail before it can be answered.";
    return {
      title: "Clarification needed",
      description,
      canRetry: false,
    };
  }

  if (result.outcome === "refusal") {
    const description =
      result.refusalClass === "unsupported_capability" ||
      result.refusalClass === "write_forbidden" ||
      result.refusalClass === "injection"
        ? REFUSAL_COPY[result.refusalClass]
        : "That question is not supported.";
    return {
      title: "Not supported",
      description,
      canRetry: false,
    };
  }

  if (result.outcome === "unavailable") {
    return {
      title: "AI analytics unavailable",
      description:
        "AI analytics is temporarily unavailable. Dashboard and Reports continue to work as usual.",
      canRetry: false,
    };
  }

  if (result.outcome === "timeout") {
    return {
      title: "Request timed out",
      description: "The request took too long. You can try again.",
      canRetry: true,
    };
  }

  return {
    title: "Something went wrong",
    description: "The question could not be answered. Try again.",
    canRetry: true,
  };
}
