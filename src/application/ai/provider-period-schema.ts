// src/application/ai/provider-period-schema.ts
import { AI_PERIOD_KINDS } from "@/application/ai/resolve-ai-period";

export type ProviderArgumentPropertySchema = {
  type: "string";
  enum?: readonly string[];
  description?: string;
};

export type ProviderArgumentSchema = {
  type: "object";
  additionalProperties: false;
  properties: Record<string, ProviderArgumentPropertySchema>;
};

const NAMED_PERIOD_KINDS = AI_PERIOD_KINDS.filter((kind) => kind !== "custom");

function providerArgumentProperty(key: string): ProviderArgumentPropertySchema {
  if (key === "periodKind") {
    return {
      type: "string",
      enum: AI_PERIOD_KINDS,
      description:
        "Application period kind. custom requires startDate and endDate. Named kinds must omit dates.",
    };
  }

  if (key === "startDate" || key === "endDate") {
    return {
      type: "string",
      description:
        "ISO date. Required with periodKind custom. Forbidden with today, week, month, or year.",
    };
  }

  return { type: "string" };
}

/**
 * Provider-facing JSON Schema for allow-listed tool args.
 * Period keys mirror parseAiPeriodRequest. Other keys stay untyped strings.
 * Pairing is described on properties: OpenAI rejects top-level allOf/if.
 */
export function providerArgumentSchema(
  argumentKeys: readonly string[],
): ProviderArgumentSchema {
  return {
    type: "object",
    additionalProperties: false,
    properties: Object.fromEntries(
      argumentKeys.map((key) => [key, providerArgumentProperty(key)]),
    ),
  };
}

function hasString(args: Record<string, unknown>, key: string): boolean {
  return typeof args[key] === "string" && args[key].length > 0;
}

export function acceptsProviderArgumentSchema(
  schema: ProviderArgumentSchema,
  args: Record<string, unknown>,
): boolean {
  for (const key of Object.keys(args)) {
    if (!(key in schema.properties)) {
      return false;
    }

    const value = args[key];
    if (typeof value !== "string" || value.length === 0) {
      return false;
    }

    const allowed = schema.properties[key]?.enum;
    if (allowed && !allowed.includes(value)) {
      return false;
    }
  }

  if (!("periodKind" in schema.properties)) {
    return true;
  }

  const periodKind = args.periodKind;
  if (periodKind === "custom") {
    return hasString(args, "startDate") && hasString(args, "endDate");
  }

  if (typeof periodKind === "string" && NAMED_PERIOD_KINDS.some((kind) => kind === periodKind)) {
    return args.startDate === undefined && args.endDate === undefined;
  }

  return args.startDate === undefined && args.endDate === undefined;
}
