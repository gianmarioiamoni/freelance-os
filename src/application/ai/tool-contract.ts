// src/application/ai/tool-contract.ts
import type { AiToolDescriptor } from "@/application/ai/ai-provider-port";
import type { WorkspaceContext } from "@/application/workspace/workspace-context";

export type AiReadTool<TResult = unknown> = {
  name: string;
  description: string;
  readOnly: true;
  argumentKeys: readonly string[];
  execute: (
    context: WorkspaceContext,
    args: Record<string, unknown>,
  ) => Promise<TResult>;
};

export function toToolDescriptor(tool: AiReadTool): AiToolDescriptor {
  return {
    name: tool.name,
    description: tool.description,
    argumentKeys: [...tool.argumentKeys],
  };
}
