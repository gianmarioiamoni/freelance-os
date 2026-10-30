// src/components/viewer-portal/ViewerMetricCard.tsx
import { Card, CardContent } from "@/components/ui/card";
import type { JSX } from "react";

type ViewerMetricCardProps = {
  label: string;
  value: string;
  secondaryValue?: string;
  ariaLabel?: string;
};

export function ViewerMetricCard({
  label,
  value,
  secondaryValue,
  ariaLabel,
}: ViewerMetricCardProps): JSX.Element {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-1">
          <dt className="text-sm font-medium text-muted-foreground">{label}</dt>
          <dd
            className="text-2xl font-bold"
            aria-label={ariaLabel || `${value} ${label}`}
          >
            {value}
            {secondaryValue && (
              <span className="ml-2 text-base font-normal text-muted-foreground">
                {secondaryValue}
              </span>
            )}
          </dd>
        </div>
      </CardContent>
    </Card>
  );
}
