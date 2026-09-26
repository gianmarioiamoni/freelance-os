// src/application/ai/tools/invoice-payment-read-tools.ts
import type { AiAnalyticsServices } from "@/application/ai/ai-service-ports";
import type { AiReadTool } from "@/application/ai/tool-contract";
import { capRows } from "@/application/ai/grounding/serialize";
import { minimizeInvoice, minimizePayment } from "@/application/ai/grounding/minimize-dtos";
import {
  parseOptionalTrackingFilter,
  parseRequiredString,
} from "@/application/ai/parse-tool-args";
import { resolveContractReference } from "@/application/ai/resolve-ai-entity";

export function createListInvoicesForContractTool(
  services: AiAnalyticsServices,
): AiReadTool {
  return {
    name: "list_invoices_for_contract",
    description: "Derived invoices for a resolved contract. Workspace invoice index is unsupported.",
    readOnly: true,
    argumentKeys: ["contractId", "tracking"],
    async execute(context, args) {
      const resolved = await resolveContractReference(context, args, services);
      const contractId = resolved?.contractId ?? parseRequiredString(args.contractId);
      const tracking = parseOptionalTrackingFilter(args.tracking);
      const rows = await services.listInvoicesForContract(context, contractId, tracking);
      return { invoices: capRows(rows).map(minimizeInvoice) };
    },
  };
}

export function createGetInvoiceTool(services: AiAnalyticsServices): AiReadTool {
  return {
    name: "get_invoice",
    description: "One derived invoice by verified invoice id.",
    readOnly: true,
    argumentKeys: ["invoiceId"],
    async execute(context, args) {
      const invoiceId = parseRequiredString(args.invoiceId);
      return minimizeInvoice(await services.getInvoice(context, invoiceId));
    },
  };
}

export function createListPaymentsForInvoiceTool(
  services: AiAnalyticsServices,
): AiReadTool {
  return {
    name: "list_payments_for_invoice",
    description: "Payments for a resolved invoice. Notes are omitted.",
    readOnly: true,
    argumentKeys: ["invoiceId"],
    async execute(context, args) {
      const invoiceId = parseRequiredString(args.invoiceId);
      const rows = await services.listPaymentsForInvoice(context, invoiceId);
      return { payments: capRows(rows).map(minimizePayment) };
    },
  };
}

export function createGetPaymentTool(services: AiAnalyticsServices): AiReadTool {
  return {
    name: "get_payment",
    description: "One payment. Requires invoiceId and paymentId from the canonical service.",
    readOnly: true,
    argumentKeys: ["invoiceId", "paymentId"],
    async execute(context, args) {
      const invoiceId = parseRequiredString(args.invoiceId);
      const paymentId = parseRequiredString(args.paymentId);
      return minimizePayment(await services.getPayment(context, invoiceId, paymentId));
    },
  };
}
