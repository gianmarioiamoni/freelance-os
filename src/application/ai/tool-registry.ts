// src/application/ai/tool-registry.ts
import { InvalidAiToolError } from "@/application/ai/ai-errors";
import { FORBIDDEN_TOOL_ARG_KEYS } from "@/application/ai/ai-types";
import {
  toToolDescriptor,
  type AiReadTool,
} from "@/application/ai/tool-contract";
import type { AiToolDescriptor } from "@/application/ai/ai-provider-port";

export type AiToolRegistry = {
  get(name: string): AiReadTool | undefined;
  descriptors(): AiToolDescriptor[];
  names(): string[];
};

export function createAiToolRegistry(tools: readonly AiReadTool[]): AiToolRegistry {
  const byName = new Map<string, AiReadTool>();

  for (const tool of tools) {
    if (!tool.readOnly) {
      throw new InvalidAiToolError(`Tool ${tool.name} must be read-only`);
    }

    if (byName.has(tool.name)) {
      throw new InvalidAiToolError(`Duplicate tool name: ${tool.name}`);
    }

    for (const key of tool.argumentKeys) {
      if ((FORBIDDEN_TOOL_ARG_KEYS as readonly string[]).includes(key)) {
        throw new InvalidAiToolError(
          `Tool ${tool.name} must not declare ${key} as an argument`,
        );
      }
    }

    byName.set(tool.name, tool);
  }

  return {
    get(name) {
      return byName.get(name);
    },
    descriptors() {
      return [...byName.values()].map(toToolDescriptor);
    },
    names() {
      return [...byName.keys()];
    },
  };
}
