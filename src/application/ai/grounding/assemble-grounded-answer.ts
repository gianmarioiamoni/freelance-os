// src/application/ai/grounding/assemble-grounded-answer.ts
import {
  fact,
  finish,
  isRecord,
  moneyFacts,
  moneyList,
  periodOf,
  type GroundedAnswer,
} from "@/application/ai/grounding/answer-facts";
import {
  assembleAllocations,
  assembleAnnualOverview,
  assembleContractReport,
} from "@/application/ai/grounding/assemble-report-answers";

export type { GroundedAnswer };

export function assembleGroundedAnswer(tool: string, dto: unknown): GroundedAnswer {
  if (!isRecord(dto)) {
    return finish(tool, [fact("result", null)]);
  }

  const period = periodOf(dto);

  if (tool === "get_current_month_analytics" || tool === "get_monthly_analytics") {
    return finish(tool, [
      fact("hours", dto.totalMinutes as number, { unit: "minutes" }),
      fact("billableHours", dto.billableMinutes as number, { unit: "minutes" }),
      ...moneyFacts("accrued", moneyList(dto.accrued)),
      ...moneyFacts("expected", moneyList(dto.expected)),
      ...(dto.forecast === null
        ? [fact("forecast", null)]
        : moneyFacts("forecast", moneyList(dto.forecast))),
    ], period);
  }

  if (
    tool === "get_accrued_revenue" ||
    tool === "get_expected_revenue" ||
    tool === "get_forecast_revenue"
  ) {
    const metric =
      tool === "get_accrued_revenue"
        ? "accrued"
        : tool === "get_expected_revenue"
          ? "expected"
          : "forecast";
    if (dto.unavailable === true || dto.byCurrency === undefined) {
      return finish(tool, [fact(metric, null)], period);
    }
    return finish(tool, moneyFacts(metric, moneyList(dto)), period);
  }

  if (tool === "get_hours_by_client") {
    const rows = Array.isArray(dto.clientAllocations) ? dto.clientAllocations : [];
    const facts = rows.flatMap((row) => {
      if (!isRecord(row) || typeof row.clientName !== "string") {
        return [];
      }
      return [
        fact("clientHours", row.totalMinutes as number, {
          unit: "minutes",
          label: row.clientName,
        }),
      ];
    });
    return finish(
      tool,
      facts.length > 0 ? facts : [fact("clientHours", 0, { unit: "minutes" })],
      period,
    );
  }

  if (tool === "get_contract_report") {
    return assembleContractReport(tool, dto, period);
  }

  if (tool === "list_contract_allocations") {
    const rows = Array.isArray(dto.allocations) ? dto.allocations : [];
    return assembleAllocations(tool, rows);
  }

  if (tool === "get_contract_allocation") {
    return assembleAllocations(tool, [dto]);
  }

  if (tool === "get_annual_overview") {
    return assembleAnnualOverview(tool, dto);
  }

  if (tool === "list_clients" || tool === "get_client") {
    const rows = Array.isArray(dto.clients) ? dto.clients : [dto];
    const facts = rows.flatMap((row) => {
      if (!isRecord(row) || typeof row.companyName !== "string") {
        return [];
      }
      return [fact("client", row.status as string, { label: row.companyName })];
    });
    return finish(tool, facts.length > 0 ? facts : [fact("client", null)]);
  }

  if (tool === "list_contracts" || tool === "get_contract") {
    const rows = Array.isArray(dto.contracts) ? dto.contracts : [dto];
    const facts = rows.flatMap((row) => {
      if (!isRecord(row) || typeof row.currency !== "string") {
        return [];
      }
      return [fact("contractRate", row.rate as string, { currency: row.currency })];
    });
    return finish(tool, facts.length > 0 ? facts : [fact("contract", null)]);
  }

  if (tool === "list_invoices_for_contract" || tool === "get_invoice") {
    const rows = Array.isArray(dto.invoices) ? dto.invoices : [dto];
    const facts = rows.flatMap((row) => {
      if (!isRecord(row) || typeof row.amount !== "string") {
        return [];
      }
      return [
        fact("invoiceAmount", row.amount, { currency: row.currency as string }),
        fact("invoicePaid", row.paidAmount as string, { currency: row.currency as string }),
        fact("invoiceOverdue", row.overdue as boolean),
      ];
    });
    return finish(tool, facts.length > 0 ? facts : [fact("invoice", null)]);
  }

  if (tool === "list_payments_for_invoice" || tool === "get_payment") {
    const rows = Array.isArray(dto.payments) ? dto.payments : [dto];
    const facts = rows.flatMap((row) => {
      if (!isRecord(row) || typeof row.amount !== "string") {
        return [];
      }
      return [fact("paymentAmount", row.amount, { currency: row.currency as string })];
    });
    return finish(tool, facts.length > 0 ? facts : [fact("payment", 0)]);
  }

  if (tool === "get_notifications") {
    const rows = Array.isArray(dto.notifications) ? dto.notifications : [];
    return finish(tool, [fact("notificationCount", rows.length)]);
  }

  return finish(tool, [fact("result", null)]);
}
