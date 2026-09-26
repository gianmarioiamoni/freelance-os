// src/application/ai/tools/entity-read-tools.ts
import type { AiAnalyticsServices } from "@/application/ai/ai-service-ports";
import type { AiReadTool } from "@/application/ai/tool-contract";
import { capRows } from "@/application/ai/grounding/serialize";
import { minimizeClient, minimizeContract } from "@/application/ai/grounding/minimize-dtos";
import {
  parseOptionalClientStatus,
  parseRequiredString,
} from "@/application/ai/parse-tool-args";
import {
  resolveClientReference,
  resolveContractReference,
} from "@/application/ai/resolve-ai-entity";

export function createListClientsTool(services: AiAnalyticsServices): AiReadTool {
  return {
    name: "list_clients",
    description: "Workspace clients as company name and status only.",
    readOnly: true,
    argumentKeys: ["status"],
    async execute(context, args) {
      const status = parseOptionalClientStatus(args.status);
      const rows = await services.listClients(context, status);
      return { clients: capRows(rows).map(minimizeClient) };
    },
  };
}

export function createGetClientTool(services: AiAnalyticsServices): AiReadTool {
  return {
    name: "get_client",
    description: "One workspace client by verified id or exact company name.",
    readOnly: true,
    argumentKeys: ["clientId", "clientName"],
    async execute(context, args) {
      const resolved = await resolveClientReference(context, args, services);
      if (!resolved) {
        parseRequiredString(args.clientId);
      }
      const client = await services.getClient(context, resolved?.clientId ?? parseRequiredString(args.clientId));
      return minimizeClient(client);
    },
  };
}

export function createListContractsTool(services: AiAnalyticsServices): AiReadTool {
  return {
    name: "list_contracts",
    description: "Commercial contract fields. paymentTermsNote is omitted.",
    readOnly: true,
    argumentKeys: ["clientId", "clientName"],
    async execute(context, args) {
      const client = await resolveClientReference(context, args, services);
      const rows = client
        ? await services.listContractsForClient(context, client.clientId)
        : await services.listContracts(context);
      return { contracts: capRows(rows).map(minimizeContract) };
    },
  };
}

export function createGetContractTool(services: AiAnalyticsServices): AiReadTool {
  return {
    name: "get_contract",
    description: "One contract by verified id. paymentTermsNote is omitted.",
    readOnly: true,
    argumentKeys: ["contractId"],
    async execute(context, args) {
      const resolved = await resolveContractReference(context, args, services);
      const contract = await services.getContract(
        context,
        resolved?.contractId ?? parseRequiredString(args.contractId),
      );
      return minimizeContract(contract);
    },
  };
}
