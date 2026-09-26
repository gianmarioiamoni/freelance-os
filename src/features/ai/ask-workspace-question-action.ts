// src/features/ai/ask-workspace-question-action.ts
"use server";

import { AlertService } from "@/application/alerts/alert-service";
import { AnalyticsService } from "@/application/analytics/analytics-service";
import { bindAnalyticsServices } from "@/application/ai/create-analytics-services";
import { createAnalyticsToolRegistry } from "@/application/ai/create-analytics-registry";
import { askWorkspaceQuestion } from "@/application/ai/orchestrator";
import type { AiAskInput, AiAskResult } from "@/application/ai/ai-types";
import { ReportingService } from "@/application/reporting/reporting-service";
import { createRepositories } from "@/infrastructure/persistence/create-repositories";
import { resolveAskProviderAdapter } from "@/features/ai/resolve-ask-provider-adapter";
import { getCurrentWorkspaceContext } from "@/infrastructure/workspace/current-workspace";

export async function askWorkspaceQuestionAction(
  input: AiAskInput,
): Promise<AiAskResult> {
  const context = await getCurrentWorkspaceContext();
  const repositories = createRepositories();
  const analytics = new AnalyticsService(repositories.analytics, repositories.members);
  const reporting = new ReportingService(analytics);
  const alerts = new AlertService(
    repositories.alerts,
    repositories.notifications,
    repositories.members,
    repositories.settings,
    analytics,
  );

  return askWorkspaceQuestion(
    { question: input.question, surface: input.surface, context },
    {
      adapter: resolveAskProviderAdapter(),
      registry: createAnalyticsToolRegistry(
        bindAnalyticsServices({
          analytics,
          reporting,
          alerts,
          clients: repositories.clients,
          contracts: repositories.contracts,
          invoices: repositories.invoices,
          payments: repositories.payments,
        }),
      ),
      members: repositories.members,
    },
  );
}
