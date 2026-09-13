// src/features/contracts/ContractDetail.tsx
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatClientStatus } from "@/features/clients/client-status";
import type { ContractApplicability } from "@/application/contracts/contract-validity";
import {
  displayMonthlyContractedHours,
  displayPaymentTerms,
  formatApplicabilityLabel,
  formatBillingModel,
  formatCalendarDate,
  formatRateWithCurrency,
  formatWorkspaceInstantDate,
} from "@/features/contracts/contract-display";
import type { ClientRecord, ContractRecord } from "@/domain/persistence-types";
import Link from "next/link";
import type { JSX } from "react";

type ContractDetailProps = {
  contract: ContractRecord;
  client: ClientRecord | null;
  applicability: ContractApplicability;
  timezone: string;
};

export function ContractDetail({
  contract,
  client,
  applicability,
  timezone,
}: ContractDetailProps): JSX.Element {
  const clientLabel = client?.companyName ?? "Client unavailable";
  const fields = [
    {
      label: "Client",
      value: client ? (
        <Link
          href={`/clients/${client.id}`}
          className="underline-offset-4 hover:underline"
        >
          {client.companyName}
        </Link>
      ) : (
        clientLabel
      ),
    },
    ...(client
      ? [{ label: "Client status", value: formatClientStatus(client.status) }]
      : []),
    { label: "Applicability", value: formatApplicabilityLabel(applicability) },
    { label: "Valid from", value: formatCalendarDate(contract.validFrom) },
    {
      label: "Valid to",
      value: contract.validTo
        ? formatCalendarDate(contract.validTo)
        : "Open-ended",
    },
    { label: "Billing model", value: formatBillingModel(contract.billingModel) },
    {
      label: "Rate",
      value: formatRateWithCurrency(contract.rate, contract.currency),
    },
    {
      label: "Monthly contracted hours",
      value: displayMonthlyContractedHours(contract.monthlyContractedMinutes),
    },
    {
      label: "Payment terms",
      value: displayPaymentTerms(
        contract.paymentTermsDays,
        contract.paymentTermsNote,
      ),
    },
    {
      label: "Created",
      value: formatWorkspaceInstantDate(contract.createdAt, timezone),
    },
    {
      label: "Updated",
      value: formatWorkspaceInstantDate(contract.updatedAt, timezone),
    },
  ] as const;

  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Commercial terms</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4">
            {fields.map((field) => (
              <div key={field.label} className="grid gap-1">
                <dt className="text-sm text-muted-foreground">{field.label}</dt>
                <dd>{field.value}</dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>
      <div>
        <Button asChild>
          <Link href={`/contracts/${contract.id}/edit`}>Edit</Link>
        </Button>
      </div>
    </div>
  );
}
