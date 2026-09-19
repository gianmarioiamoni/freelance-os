// src/components/dashboard/ContractUtilization.tsx
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/states/EmptyState";
import { AnalyticsService } from "@/application/analytics/analytics-service";
import type { ContractUtilization } from "@/domain/analytics-types";
import type { JSX } from "react";

type ContractUtilizationProps = {
  utilizations: ContractUtilization[];
};

export function ContractUtilization({ utilizations }: ContractUtilizationProps): JSX.Element {
  if (utilizations.length === 0) {
    return (
      <Card>
        <CardHeader>
          <h2 className="font-heading text-base leading-snug font-medium group-data-[size=sm]/card:text-sm">
            Contract Utilization
          </h2>
        </CardHeader>
        <CardContent>
          <EmptyState
            title="No contracts for current period"
            description="Contract utilization will appear here when you have active contracts."
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <h2 className="font-heading text-base leading-snug font-medium group-data-[size=sm]/card:text-sm">
          Contract Utilization
        </h2>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {utilizations.map((utilization) => {
            const consumedHours = AnalyticsService.formatDuration(utilization.consumedMinutes);
            const contractedHours = utilization.contractedMinutes 
              ? AnalyticsService.formatDuration(utilization.contractedMinutes)
              : null;
            const utilizationPercentage = AnalyticsService.formatPercentage(utilization.utilizationPercentage);
            
            // BR-105-016: isOngoing ≡ validTo === null (contract ongoing status).
            // BR-105-016: contractedMinutes !== null ≡ finite capacity available.
            // These two properties are INDEPENDENT. Display logic must respect both:
            //   - Capacity/utilization display is governed by contractedMinutes (not isOngoing).
            //   - Ongoing status is surfaced as an independent label.
            const hasFiniteCapacity = utilization.contractedMinutes !== null;

            return (
              <div key={utilization.contractId} className="space-y-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-sm">{utilization.clientName}</h3>
                    {utilization.isArchived && (
                      <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                        Archived
                      </span>
                    )}
                    {utilization.isOngoing && (
                      <span className="text-xs text-muted-foreground" aria-label="ongoing contract">
                        Ongoing
                      </span>
                    )}
                  </div>

                  {hasFiniteCapacity ? (
                    // Finite capacity: show consumed / contracted and percentage.
                    // Applies to both ongoing+finite and finite+finite contracts.
                    <div className="text-sm">
                      <span aria-label={`${consumedHours} consumed of ${contractedHours} contracted, ${utilizationPercentage} utilization`}>
                        <strong>{consumedHours}</strong> / {contractedHours}
                        <span className="ml-2 text-muted-foreground">({utilizationPercentage})</span>
                      </span>
                    </div>
                  ) : (
                    // Null capacity (unlimited): show only consumed hours, no denominator.
                    <div className="text-sm">
                      <span aria-label={`${consumedHours} consumed, unlimited capacity`}>
                        <strong>{consumedHours}</strong>
                      </span>
                    </div>
                  )}
                </div>

                {hasFiniteCapacity && (
                  <div 
                    className="h-2 bg-muted rounded-full overflow-hidden"
                    role="progressbar"
                    aria-valuenow={utilization.utilizationPercentage || 0}
                    aria-valuemax={100}
                    aria-label={`${utilization.clientName} contract: ${utilizationPercentage} utilized`}
                  >
                    <div 
                      className={`h-full transition-all duration-300 ${
                        (utilization.utilizationPercentage || 0) > 100 
                          ? 'bg-destructive' 
                          : (utilization.utilizationPercentage || 0) > 80 
                            ? 'bg-warning' 
                            : 'bg-primary'
                      }`}
                      style={{ 
                        width: `${Math.min(utilization.utilizationPercentage || 0, 100)}%` 
                      }}
                    />
                  </div>
                )}

                {hasFiniteCapacity &&
                utilization.utilizationPercentage !== null &&
                utilization.utilizationPercentage > 100 ? (
                  <p className="text-xs text-destructive" role="alert">
                    Over contracted capacity by {AnalyticsService.formatPercentage(utilization.utilizationPercentage - 100)}
                  </p>
                ) : null}
                {hasFiniteCapacity &&
                utilization.utilizationPercentage !== null &&
                utilization.utilizationPercentage <= 100 ? (
                  <p className="text-xs text-muted-foreground">Within contracted capacity</p>
                ) : null}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}