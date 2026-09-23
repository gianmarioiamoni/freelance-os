// src/features/contracts/ContractAllocationDetail.tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ContractAllocation } from "@/domain/analytics-types";
import {
  ALLOCATION_NOT_CONFIGURED_LABEL,
  allocationStatusLabel,
  allocationStatusTone,
  formatAllocationMinutes,
  hasActiveAllocation,
  isZeroAllocation,
} from "@/features/contracts/contract-allocation-display";
import type { JSX } from "react";

type ContractAllocationDetailProps = {
  allocation: ContractAllocation;
};

export function ContractAllocationDetail({
  allocation,
}: ContractAllocationDetailProps): JSX.Element {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2 className="font-heading text-base leading-snug font-medium">
            Time allocation
          </h2>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="grid gap-4">
          {allocation.allocatedMinutes === null ? (
            <AllocationRow label="Allocation" value={ALLOCATION_NOT_CONFIGURED_LABEL} />
          ) : (
            <AllocationRow
              label="Allocated"
              value={formatAllocationMinutes(allocation.allocatedMinutes)}
            />
          )}
          {isZeroAllocation(allocation) || hasActiveAllocation(allocation) ? (
            <AllocationRow
              label="Consumed"
              value={formatAllocationMinutes(allocation.consumedMinutes)}
            />
          ) : null}
          {hasActiveAllocation(allocation) && allocation.remainingMinutes !== null ? (
            <AllocationRow
              label="Remaining"
              value={formatAllocationMinutes(allocation.remainingMinutes)}
            />
          ) : null}
          <AllocationStatusRow status={allocation.allocationStatus} />
        </dl>
      </CardContent>
    </Card>
  );
}

function AllocationRow({
  label,
  value,
}: {
  label: string;
  value: string;
}): JSX.Element {
  return (
    <div className="grid gap-1">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function AllocationStatusRow({
  status,
}: {
  status: ContractAllocation["allocationStatus"];
}): JSX.Element | null {
  const label = allocationStatusLabel(status);
  const tone = allocationStatusTone(status);

  if (label === null || tone === null) {
    return null;
  }

  const className =
    tone === "warning"
      ? "text-xs text-warning-foreground bg-warning px-1.5 py-0.5 rounded w-fit"
      : tone === "error"
        ? "text-xs text-destructive"
        : "text-sm";

  return (
    <div className="grid gap-1">
      <dt className="text-sm text-muted-foreground">Status</dt>
      <dd>
        <span className={className}>{label}</span>
      </dd>
    </div>
  );
}
