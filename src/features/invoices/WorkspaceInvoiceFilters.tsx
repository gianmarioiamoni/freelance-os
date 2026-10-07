// src/features/invoices/WorkspaceInvoiceFilters.tsx
"use client";

import { Field } from "@/components/forms/Field";
import { Button } from "@/components/ui/button";
import {
  formatTrackingFilterLabel,
  INVOICE_TRACKING_FILTERS,
} from "@/features/invoices/invoice-display";
import { WorkspaceInvoicePeriodSelector } from "@/features/invoices/WorkspaceInvoicePeriodSelector";
import {
  workspaceInvoiceClientHref,
  workspaceInvoiceTrackingHref,
  type WorkspaceInvoiceViewState,
} from "@/features/invoices/workspace-invoice-filters";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { JSX } from "react";

type WorkspaceInvoiceFiltersProps = {
  view: WorkspaceInvoiceViewState;
  clients: Array<{ id: string; label: string }>;
};

const SELECT_CLASS_NAME =
  "flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1";

export function WorkspaceInvoiceFilters({
  view,
  clients,
}: WorkspaceInvoiceFiltersProps): JSX.Element {
  const router = useRouter();

  return (
    <div className="grid gap-4">
      <WorkspaceInvoicePeriodSelector view={view} />

      <nav aria-label="Invoice tracking" className="flex flex-wrap gap-2">
        {INVOICE_TRACKING_FILTERS.map((tracking) => (
          <Button
            key={tracking}
            asChild
            variant={tracking === view.tracking ? "default" : "outline"}
          >
            <Link
              href={workspaceInvoiceTrackingHref(view, tracking)}
              aria-current={tracking === view.tracking ? "page" : undefined}
            >
              {formatTrackingFilterLabel(tracking)}
            </Link>
          </Button>
        ))}
      </nav>

      <div role="group" aria-label="Invoice filters" className="grid gap-3 md:max-w-sm">
        <Field label="Client" htmlFor="invoice-filter-client">
          <select
            id="invoice-filter-client"
            value={view.clientId ?? ""}
            onChange={(event) => {
              const clientId = event.target.value || undefined;
              router.push(workspaceInvoiceClientHref(view, clientId));
            }}
            className={SELECT_CLASS_NAME}
          >
            <option value="">All clients</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.label}
              </option>
            ))}
            {view.clientId &&
            !clients.some((client) => client.id === view.clientId) ? (
              <option value={view.clientId}>Unknown client</option>
            ) : null}
          </select>
        </Field>
      </div>
    </div>
  );
}
