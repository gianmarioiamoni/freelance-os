// src/application/ai/map-refuse-tool.ts
import {
  isSentinelRefuseClass,
  isSentinelRefuseName,
} from "@/application/ai/capability-catalog";
import type { AiSentinelRefuseClass } from "@/application/ai/capability-catalog";

export type RefuseToolMapping =
  | { kind: "not_refuse" }
  | { kind: "refusal"; refusalClass: AiSentinelRefuseClass }
  | { kind: "error" };

export function mapRefuseToolCall(
  toolName: string,
  args: Record<string, unknown>,
): RefuseToolMapping {
  if (!isSentinelRefuseName(toolName)) {
    return { kind: "not_refuse" };
  }

  if (!isSentinelRefuseClass(args.class)) {
    return { kind: "error" };
  }

  return { kind: "refusal", refusalClass: args.class };
}
