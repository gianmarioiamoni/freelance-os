// src/application/ai/tools/refuse-tool.ts
import {
  AI_SENTINEL_REFUSE_NAME,
  AI_TOOL_DESCRIPTIONS,
} from "@/application/ai/capability-catalog";
import { InvalidAiToolError } from "@/application/ai/ai-errors";
import type { AiReadTool } from "@/application/ai/tool-contract";

export function createRefuseTool(): AiReadTool {
  return {
    name: AI_SENTINEL_REFUSE_NAME,
    description: AI_TOOL_DESCRIPTIONS.refuse,
    readOnly: true,
    argumentKeys: ["class"],
    async execute() {
      throw new InvalidAiToolError("refuse must not execute an application tool");
    },
  };
}
