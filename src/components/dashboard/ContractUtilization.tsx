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
            title="No contracts with budget"
            description="Contract utilization will appear here when you have contracts with allocated budget."
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
            const budgetHours = utilization.contractedMinutes 
              ? AnalyticsService.formatDuration(utilization.contractedMinutes)
              : null;
            const utilizationPercentage = AnalyticsService.formatPercentage(utilization.utilizationPercentage);
            
            // contractedMinutes holds allocatedMinutes (total contract budget).
            // null means no budget defined for this contract.
            const hasBudget = utilization.contractedMinutes !== null;

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

                  {hasBudget ? (
                    // Contract with budget: show cumulative consumed / total budget and percentage
                    <div className="text-sm">
                      <span aria-label={`${consumedHours} consumed of ${budgetHours} total budget, ${utilizationPercentage} utilization`}>
                        <strong>{consumedHours}</strong> / {budgetHours}
                        <span className="ml-2 text-muted-foreground">({utilizationPercentage})</span>
                      </span>
                    </div>
                  ) : (
                    // No budget defined: show only consumed hours
                    <div className="text-sm">
                      <span aria-label={`${consumedHours} consumed, no budget defined`}>
                        <strong>{consumedHours}</strong>
                      </span>
                    </div>
                  )}
                </div>

                {hasBudget && (
                  <div 
                    className="h-2 bg-muted rounded-full overflow-hidden"
                    role="progressbar"
                    aria-valuenow={utilization.utilizationPercentage || 0}
                    aria-valuemax={100}
                    aria-label={`${utilization.clientName} contract: ${utilizationPercentage} of budget consumed`}
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

                {hasBudget &&
                utilization.utilizationPercentage !== null &&
                utilization.utilizationPercentage > 100 ? (
                  <p className="text-xs text-destructive" role="alert">
                    Over budget by {AnalyticsService.formatPercentage(utilization.utilizationPercentage - 100)}
                  </p>
                ) : null}
                {hasBudget &&
                utilization.utilizationPercentage !== null &&
                utilization.utilizationPercentage <= 100 ? (
                  <p className="text-xs text-muted-foreground">Within budget</p>
                ) : null}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}