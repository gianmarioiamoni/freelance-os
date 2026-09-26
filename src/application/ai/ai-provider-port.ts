// src/application/ai/ai-provider-port.ts
import type { AiRefusalClass, AiUsage } from "@/application/ai/ai-types";

export type AiToolDescriptor = {
  name: string;
  description: string;
  argumentKeys: string[];
};

export type AiAdapterRequest = {
  system: string;
  user: string;
  toolDescriptors: AiToolDescriptor[];
  timeoutMs: number;
  correlationId: string;
};

export type AiToolCall = {
  name: string;
  args: unknown;
};

export type AiAdapterResult =
  | {
      status: "tool_calls";
      toolCalls: AiToolCall[];
      usage?: AiUsage;
      providerId: string;
      modelId: string;
    }
  | {
      status: "message";
      message: string;
      usage?: AiUsage;
      providerId: string;
      modelId: string;
    }
  | {
      status: "refusal";
      refusalClass: AiRefusalClass;
      usage?: AiUsage;
      providerId: string;
      modelId: string;
    }
  | {
      status: "unavailable";
      providerId: string;
      modelId: string;
    }
  | {
      status: "timeout";
      providerId: string;
      modelId: string;
    }
  | {
      status: "error";
      code: string;
      providerId: string;
      modelId: string;
    };

export type AiProviderAdapter = {
  complete(request: AiAdapterRequest): Promise<AiAdapterResult>;
};
