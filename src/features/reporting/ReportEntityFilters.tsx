// src/features/reporting/ReportEntityFilters.tsx
"use client";

import { Field } from "@/components/forms/Field";
import type { ReportFilterOption } from "@/features/reporting/report-filter-options";
import {
  periodHrefFromState,
  type ReportEntityFilterParam,
  type ReportPeriodParam,
} from "@/features/reporting/reporting-types";
import { useRouter } from "next/navigation";
import type { JSX } from "react";

type ReportEntityFiltersProps = {
  period: ReportPeriodParam;
  filter: ReportEntityFilterParam;
  clients: ReportFilterOption[];
  contracts: ReportFilterOption[];
};

const SELECT_CLASS_NAME =
  "flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1";

export function ReportEntityFilters({
  period,
  filter,
  clients,
  contracts,
}: ReportEntityFiltersProps): JSX.Element {
  const router = useRouter();

  function navigate(next: ReportEntityFilterParam): void {
    router.push(periodHrefFromState(period, next));
  }

  return (
    <div role="group" aria-label="Report filters" className="grid gap-3 md:grid-cols-2">
      <Field label="Client" htmlFor="report-filter-client">
        <select
          id="report-filter-client"
          value={filter.clientId ?? ""}
          onChange={(event) => {
            const clientId = event.target.value || undefined;
            navigate({
              ...(clientId ? { clientId } : {}),
              ...(filter.contractId ? { contractId: filter.contractId } : {}),
            });
          }}
          className={SELECT_CLASS_NAME}
        >
          <option value="">All clients</option>
          {clients.map((client) => (
            <option key={client.id} value={client.id}>
              {client.label}
            </option>
          ))}
          {missingCurrentOption(filter.clientId, clients) ? (
            <option value={filter.clientId}>Unknown client</option>
          ) : null}
        </select>
      </Field>

      <Field label="Contract" htmlFor="report-filter-contract">
        <select
          id="report-filter-contract"
          value={filter.contractId ?? ""}
          onChange={(event) => {
            const contractId = event.target.value || undefined;
            navigate({
              ...(filter.clientId ? { clientId: filter.clientId } : {}),
              ...(contractId ? { contractId } : {}),
            });
          }}
          className={SELECT_CLASS_NAME}
        >
          <option value="">All contracts</option>
          {contracts.map((contract) => (
            <option key={contract.id} value={contract.id}>
              {contract.label}
            </option>
          ))}
          {missingCurrentOption(filter.contractId, contracts) ? (
            <option value={filter.contractId}>Unknown contract</option>
          ) : null}
        </select>
      </Field>
    </div>
  );
}

function missingCurrentOption(
  currentId: string | undefined,
  options: ReportFilterOption[],
): currentId is string {
  return Boolean(currentId) && !options.some((option) => option.id === currentId);
}
