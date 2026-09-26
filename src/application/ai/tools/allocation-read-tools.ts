// src/application/ai/tools/allocation-read-tools.ts
import { AiClarificationError } from "@/application/ai/ai-errors";
import type { AiAnalyticsServices } from "@/application/ai/ai-service-ports";
import type { AiReadTool } from "@/application/ai/tool-contract";
import {
  resolveAllocationClientLabels,
  resolveOneAllocationClientLabel,
} from "@/application/ai/grounding/allocation-client-labels";
import { capRows } from "@/application/ai/grounding/serialize";
import { minimizeAllocation } from "@/application/ai/grounding/minimize-dtos";
import { parseRequiredString } from "@/application/ai/parse-tool-args";
import { resolveAnalyticsFilter, resolveContractReference } from "@/application/ai/resolve-ai-entity";

export function createListContractAllocationsTool(
  services: AiAnalyticsServices,
): AiReadTool {
  return {
    name: "list_contract_allocations",
    description:
      "Owns derived allocation, remaining minutes, and status for workspace contracts. Not a commercial contract entity list and not a utilization report.",
    readOnly: true,
    argumentKeys: ["clientId", "clientName", "contractId"],
    async execute(context, args) {
      const filter = await resolveAnalyticsFilter(context, args, services);
      const rows = capRows(await services.listContractAllocations(context, filter));
      const labels = await resolveAllocationClientLabels(
        context,
        rows.map((row) => row.contractId),
        services,
      );
      return {
        allocations: rows.map((row) => minimizeAllocation(row, labels.get(row.contractId))),
      };
    },
  };
}

export function createGetContractAllocationTool(
  services: AiAnalyticsServices,
): AiReadTool {
  return {
    name: "get_contract_allocation",
    description: "Derived allocation view for one resolved contract.",
    readOnly: true,
    argumentKeys: ["contractId"],
    async execute(context, args) {
      const resolved = await resolveContractReference(context, args, services);
      const contractId = resolved?.contractId ?? parseRequiredString(args.contractId);
      if (!contractId) {
        throw new AiClarificationError("unknown_entity");
      }
      const [allocation, clientName] = await Promise.all([
        services.getContractAllocation(context, contractId),
        resolveOneAllocationClientLabel(context, contractId, services),
      ]);
      return minimizeAllocation(allocation, clientName);
    },
  };
}
