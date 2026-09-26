// src/features/ai/ask-workspace-question-action.ts
"use server";

import { AnalyticsService } from "@/application/analytics/analytics-service";
import { createFoundationToolRegistry } from "@/application/ai/create-foundation-registry";
import { askWorkspaceQuestion } from "@/application/ai/orchestrator";
import type { AiAskInput, AiAskResult } from "@/application/ai/ai-types";
import { createRepositories } from "@/infrastructure/persistence/create-repositories";
import { createNullAiProviderAdapter } from "@/infrastructure/ai/null-ai-provider-adapter";
import { getCurrentWorkspaceContext } from "@/infrastructure/workspace/current-workspace";

export async function askWorkspaceQuestionAction(
  input: AiAskInput,
): Promise<AiAskResult> {
  const context = await getCurrentWorkspaceContext();
  const repositories = createRepositories();
  const analytics = new AnalyticsService(repositories.analytics, repositories.members);

  return askWorkspaceQuestion(
    { question: input.question, surface: input.surface, context },
    {
      adapter: createNullAiProviderAdapter(),
      registry: createFoundationToolRegistry(analytics),
      members: repositories.members,
    },
  );
}
