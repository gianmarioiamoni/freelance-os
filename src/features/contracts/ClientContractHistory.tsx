// src/features/contracts/ClientContractHistory.tsx
import { EmptyState } from "@/components/states/EmptyState";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { deriveContractApplicability } from "@/application/contracts/contract-validity";
import {
  formatApplicabilityLabel,
  formatBillingModel,
  formatRateWithCurrency,
  formatValidityInterval,
} from "@/features/contracts/contract-display";
import type { ClientRecord, ContractRecord } from "@/domain/persistence-types";
import Link from "next/link";
import type { JSX } from "react";

type ClientContractHistoryProps = {
  client: ClientRecord;
  contracts: ContractRecord[];
  today: Date;
};

export function ClientContractHistory({
  client,
  contracts,
  today,
}: ClientContractHistoryProps): JSX.Element {
  const isActive = client.status === "ACTIVE";

  return (
    <section className="grid gap-4" aria-labelledby="client-contract-history">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="client-contract-history">Contracts</h2>
        {isActive ? (
          <Button asChild>
            <Link href={`/contracts/new?clientId=${client.id}`}>New contract</Link>
          </Button>
        ) : null}
      </div>
      {contracts.length === 0 ? (
        <EmptyState
          title="No contracts"
          description="Contracts for this client will appear here."
        />
      ) : (
        <ul className="grid gap-3">
          {contracts.map((contract) => {
            const applicability = deriveContractApplicability(
              contract.validFrom,
              contract.validTo,
              today,
            );

            return (
              <li key={contract.id}>
                <Card>
                  <CardHeader>
                    <CardTitle>
                      <Link
                        href={`/contracts/${contract.id}`}
                        className="underline-offset-4 hover:underline"
                      >
                        {formatValidityInterval(contract.validFrom, contract.validTo)}
                      </Link>
                    </CardTitle>
                    <CardDescription>
                      {formatApplicabilityLabel(applicability)}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">
                      {formatBillingModel(contract.billingModel)}
                      {" · "}
                      {formatRateWithCurrency(contract.rate, contract.currency)}
                    </p>
                  </CardContent>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
