// src/features/contracts/ContractList.tsx
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  formatApplicabilityLabel,
  formatBillingModel,
  formatRateWithCurrency,
  formatValidityInterval,
  type ContractListItem,
} from "@/features/contracts/contract-display";
import type { JSX } from "react";

type ContractListProps = {
  items: ContractListItem[];
};

export function ContractList({ items }: ContractListProps): JSX.Element {
  return (
    <ul className="grid gap-3">
      {items.map((item) => (
        <li key={item.contract.id}>
          <Card>
            <CardHeader>
              <CardTitle>
                <a
                  href={`/contracts/${item.contract.id}`}
                  className="underline-offset-4 hover:underline"
                >
                  {item.clientName}
                </a>
              </CardTitle>
              <CardDescription>
                {formatApplicabilityLabel(item.applicability)}
                {item.clientArchived ? " · Archived client" : ""}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p>{formatValidityInterval(item.contract.validFrom, item.contract.validTo)}</p>
              <p className="text-muted-foreground">
                {formatBillingModel(item.contract.billingModel)}
                {" · "}
                {formatRateWithCurrency(item.contract.rate, item.contract.currency)}
              </p>
            </CardContent>
          </Card>
        </li>
      ))}
    </ul>
  );
}
