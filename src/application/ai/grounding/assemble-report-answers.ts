// src/application/ai/grounding/assemble-report-answers.ts
import {
  cite,
  fact,
  finish,
  finishWithCitations,
  isRecord,
  moneyFacts,
  moneyList,
  periodOf,
  rowClientLabel,
  type GroundedAnswer,
} from "@/application/ai/grounding/answer-facts";

export function assembleContractReport(
  tool: string,
  dto: Record<string, unknown>,
  period?: ReturnType<typeof periodOf>,
): GroundedAnswer {
  const facts = [
    ...moneyFacts("accrued", moneyList(dto.accrued)),
    ...moneyFacts("expected", moneyList(dto.expected)),
    ...(dto.forecast === null
      ? [fact("forecast", null)]
      : moneyFacts("forecast", moneyList(dto.forecast))),
  ];

  const utilizations = Array.isArray(dto.contractUtilizations)
    ? dto.contractUtilizations
    : [];
  for (const row of utilizations) {
    if (!isRecord(row)) {
      continue;
    }
    const label = rowClientLabel(row);
    facts.push(
      fact("consumedMinutes", row.consumedMinutes as number, {
        unit: "minutes",
        label,
      }),
      fact("contractedMinutes", (row.contractedMinutes as number | null) ?? null, {
        unit: "minutes",
        label,
      }),
      fact("utilizationPercentage", (row.utilizationPercentage as number | null) ?? null, {
        label,
      }),
    );
  }

  const allocations = Array.isArray(dto.contractAllocations)
    ? dto.contractAllocations
    : [];
  for (const row of allocations) {
    if (!isRecord(row)) {
      continue;
    }
    const label = rowClientLabel(row);
    facts.push(
      fact("allocatedMinutes", (row.allocatedMinutes as number | null) ?? null, {
        unit: "minutes",
        label,
      }),
      fact("remainingMinutes", (row.remainingMinutes as number | null) ?? null, {
        unit: "minutes",
        label,
      }),
      fact("allocationStatus", (row.allocationStatus as string | null) ?? null, {
        label,
      }),
    );
  }

  return finish(tool, facts, period);
}

export function assembleAllocations(tool: string, rows: unknown[]): GroundedAnswer {
  const facts = rows.flatMap((row) => {
    if (!isRecord(row)) {
      return [];
    }
    const label = rowClientLabel(row);
    return [
      fact("consumedMinutes", row.consumedMinutes as number, {
        unit: "minutes",
        label,
      }),
      fact("remainingMinutes", (row.remainingMinutes as number | null) ?? null, {
        unit: "minutes",
        label,
      }),
      fact("allocationStatus", (row.allocationStatus as string | null) ?? null, {
        label,
      }),
    ];
  });
  return finish(tool, facts.length > 0 ? facts : [fact("allocations", 0)]);
}

export function assembleAnnualOverview(
  tool: string,
  dto: Record<string, unknown>,
): GroundedAnswer {
  const months = Array.isArray(dto.months) ? dto.months : [];
  const facts = [];
  const citations = [];

  for (const month of months) {
    if (!isRecord(month)) {
      continue;
    }
    const monthPeriod = periodOf(month) ?? periodOf(month.accrued);
    const monthFacts = moneyFacts("accrued", moneyList(month.accrued));
    facts.push(...monthFacts);
    citations.push(...monthFacts.map((item) => cite(tool, item, monthPeriod)));
  }

  if (facts.length === 0) {
    return finish(tool, [fact("accrued", 0)]);
  }

  return finishWithCitations(facts, citations);
}
