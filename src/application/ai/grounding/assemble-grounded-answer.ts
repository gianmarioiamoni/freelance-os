// src/application/ai/grounding/assemble-grounded-answer.ts
import type { AiCitation, AiGroundedFact } from "@/application/ai/ai-types";
import { AnalyticsService } from "@/application/analytics/analytics-service";
import type { AiPeriodDto } from "@/application/ai/grounding/serialize";

export type GroundedAnswer = {
  text: string;
  facts: AiGroundedFact[];
  citations: AiCitation[];
};

function fact(
  metric: string,
  value: AiGroundedFact["value"],
  extras: Omit<AiGroundedFact, "metric" | "value"> = {},
): AiGroundedFact {
  return { metric, value, ...extras };
}

function cite(
  tool: string,
  item: AiGroundedFact,
  period?: AiPeriodDto,
): AiCitation {
  return {
    tool,
    metric: item.metric,
    value: item.value,
    currency: item.currency,
    unit: item.unit,
    period,
    clientLabel: item.label,
    contractLabel: item.label && item.metric.startsWith("contract") ? item.label : undefined,
  };
}

function moneyFacts(
  prefix: string,
  rows: ReadonlyArray<{ currency: string; published: number | null }>,
): AiGroundedFact[] {
  if (rows.length === 0) {
    return [fact(prefix, 0)];
  }
  return rows.map((row) => fact(prefix, row.published, { currency: row.currency }));
}

function formatFact(item: AiGroundedFact): string {
  if (item.value === null) {
    return `${item.metric}: non disponibile`;
  }
  if (item.currency) {
    return `${item.metric}: ${item.value} ${item.currency}`;
  }
  if (item.unit === "minutes") {
    return `${item.metric}: ${AnalyticsService.formatDuration(Number(item.value))}`;
  }
  if (item.label) {
    return `${item.metric} (${item.label}): ${item.value}`;
  }
  return `${item.metric}: ${item.value}`;
}

function finish(tool: string, facts: AiGroundedFact[], period?: AiPeriodDto): GroundedAnswer {
  return {
    text: facts.map(formatFact).join(". ") + ".",
    facts,
    citations: facts.map((item) => cite(tool, item, period)),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function periodOf(value: unknown): AiPeriodDto | undefined {
  if (!isRecord(value) || !isRecord(value.period)) {
    return undefined;
  }
  const { startDate, endDate } = value.period;
  if (typeof startDate === "string" && typeof endDate === "string") {
    return { startDate, endDate };
  }
  return undefined;
}

function moneyList(value: unknown): Array<{ currency: string; published: number | null }> {
  if (!isRecord(value) || !Array.isArray(value.byCurrency)) {
    return [];
  }
  return value.byCurrency.flatMap((row) => {
    if (!isRecord(row) || typeof row.currency !== "string") {
      return [];
    }
    const published = row.published;
    if (published !== null && typeof published !== "number") {
      return [];
    }
    return [{ currency: row.currency, published }];
  });
}

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
    return finish(tool, facts.length > 0 ? facts : [fact("clientHours", 0, { unit: "minutes" })], period);
  }

  if (tool === "get_contract_report") {
    return finish(tool, [
      ...moneyFacts("accrued", moneyList(dto.accrued)),
      ...moneyFacts("expected", moneyList(dto.expected)),
      ...(dto.forecast === null
        ? [fact("forecast", null)]
        : moneyFacts("forecast", moneyList(dto.forecast))),
    ], period);
  }

  if (tool === "list_contract_allocations") {
    const rows = Array.isArray(dto.allocations) ? dto.allocations : [];
    const facts = rows.flatMap((row) => {
      if (!isRecord(row)) {
        return [];
      }
      return [
        fact("consumedMinutes", row.consumedMinutes as number, { unit: "minutes" }),
        fact("remainingMinutes", (row.remainingMinutes as number | null) ?? null, {
          unit: "minutes",
        }),
        fact("allocationStatus", (row.allocationStatus as string | null) ?? null),
      ];
    });
    return finish(tool, facts.length > 0 ? facts : [fact("allocations", 0)]);
  }

  if (tool === "get_contract_allocation") {
    return finish(tool, [
      fact("consumedMinutes", dto.consumedMinutes as number, { unit: "minutes" }),
      fact("remainingMinutes", (dto.remainingMinutes as number | null) ?? null, { unit: "minutes" }),
      fact("allocationStatus", (dto.allocationStatus as string | null) ?? null),
    ]);
  }

  if (tool === "get_annual_overview") {
    const months = Array.isArray(dto.months) ? dto.months : [];
    const facts = months.flatMap((month) => {
      if (!isRecord(month)) {
        return [];
      }
      return moneyFacts("accrued", moneyList(month.accrued));
    });
    return finish(tool, facts.length > 0 ? facts : [fact("accrued", 0)], period);
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
