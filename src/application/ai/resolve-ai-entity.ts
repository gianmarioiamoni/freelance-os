// src/application/ai/resolve-ai-entity.ts
import { AiClarificationError } from "@/application/ai/ai-errors";
import { parseOptionalString } from "@/application/ai/parse-tool-args";
import type { WorkspaceContext } from "@/application/workspace/workspace-context";
import type { ClientStatus } from "@/domain/persistence-types";

export type AiClientIdentity = {
  clientId: string;
  companyName: string;
};

export type AiClientDirectory = {
  listClients(
    context: WorkspaceContext,
    status?: ClientStatus,
  ): Promise<Array<{ id: string; companyName: string; status: ClientStatus }>>;
  getClient(
    context: WorkspaceContext,
    clientId: string,
  ): Promise<{ id: string; companyName: string; status: ClientStatus }>;
};

export type AiContractDirectory = {
  getContract(
    context: WorkspaceContext,
    contractId: string,
  ): Promise<{ id: string }>;
};

/**
 * Case-insensitive exact companyName match. IDs are verified through getClient.
 * Ambiguous and unknown names do not resolve.
 */
export async function resolveClientReference(
  context: WorkspaceContext,
  args: Record<string, unknown>,
  directory: AiClientDirectory,
): Promise<AiClientIdentity | undefined> {
  const clientName = parseOptionalString(args.clientName);
  if (clientName) {
    const rows = await directory.listClients(context);
    const needle = clientName.toLowerCase();
    const matches = rows.filter((row) => row.companyName.toLowerCase() === needle);

    if (matches.length === 0) {
      throw new AiClarificationError("unknown_entity");
    }
    if (matches.length > 1) {
      throw new AiClarificationError("ambiguous_entity");
    }

    return { clientId: matches[0].id, companyName: matches[0].companyName };
  }

  const clientId = parseOptionalString(args.clientId);
  if (!clientId) {
    return undefined;
  }

  const client = await directory.getClient(context, clientId);
  return { clientId: client.id, companyName: client.companyName };
}

export async function resolveContractReference(
  context: WorkspaceContext,
  args: Record<string, unknown>,
  directory: AiContractDirectory,
): Promise<{ contractId: string } | undefined> {
  const contractId = parseOptionalString(args.contractId);
  if (!contractId) {
    return undefined;
  }

  const contract = await directory.getContract(context, contractId);
  return { contractId: contract.id };
}

export async function resolveAnalyticsFilter(
  context: WorkspaceContext,
  args: Record<string, unknown>,
  directory: AiClientDirectory & AiContractDirectory,
): Promise<{ clientId?: string; contractId?: string } | undefined> {
  const client = await resolveClientReference(context, args, directory);
  const contract = await resolveContractReference(context, args, directory);

  if (!client && !contract) {
    return undefined;
  }

  return {
    ...(client ? { clientId: client.clientId } : {}),
    ...(contract ? { contractId: contract.contractId } : {}),
  };
}
