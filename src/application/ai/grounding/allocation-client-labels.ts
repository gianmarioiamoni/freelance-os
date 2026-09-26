// src/application/ai/grounding/allocation-client-labels.ts
import type { AiAnalyticsServices } from "@/application/ai/ai-service-ports";
import type { WorkspaceContext } from "@/application/workspace/workspace-context";
import { UnauthorizedWorkspaceAccessError } from "@/domain/workspace-errors";

export async function resolveAllocationClientLabels(
  context: WorkspaceContext,
  contractIds: readonly string[],
  services: Pick<AiAnalyticsServices, "listClients" | "listContracts">,
): Promise<Map<string, string>> {
  const wanted = new Set(contractIds.filter((id) => id.length > 0));
  if (wanted.size === 0) {
    return new Map();
  }

  const [contracts, clients] = await Promise.all([
    services.listContracts(context),
    services.listClients(context),
  ]);

  const clientNames = new Map(clients.map((client) => [client.id, client.companyName]));
  const labels = new Map<string, string>();

  for (const contract of contracts) {
    if (!wanted.has(contract.id)) {
      continue;
    }
    const clientName = clientNames.get(contract.clientId);
    if (typeof clientName === "string" && clientName.length > 0) {
      labels.set(contract.id, clientName);
    }
  }

  return labels;
}

export async function resolveOneAllocationClientLabel(
  context: WorkspaceContext,
  contractId: string,
  services: Pick<AiAnalyticsServices, "getClient" | "getContract">,
): Promise<string | undefined> {
  try {
    const contract = await services.getContract(context, contractId);
    const client = await services.getClient(context, contract.clientId);
    return client.companyName.length > 0 ? client.companyName : undefined;
  } catch (error) {
    if (error instanceof UnauthorizedWorkspaceAccessError) {
      throw error;
    }
    return undefined;
  }
}
