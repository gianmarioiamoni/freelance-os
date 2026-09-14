// src/components/dashboard/ContractUtilization.tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
          <CardTitle role="heading" aria-level={2}>Contract Utilization</CardTitle>
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
        <CardTitle role="heading" aria-level={2}>Contract Utilization</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {utilizations.map((utilization) => {
            const consumedHours = AnalyticsService.formatDuration(utilization.consumedMinutes);
            const contractedHours = utilization.contractedMinutes 
              ? AnalyticsService.formatDuration(utilization.contractedMinutes)
              : null;
            const utilizationPercentage = AnalyticsService.formatPercentage(utilization.utilizationPercentage);
            
            return (
              <div key={utilization.contractId} className="space-y-2">
                <div className="space-y-1">
                  <h3 className="font-medium text-sm">{utilization.clientName}</h3>
                  
                  {utilization.isOngoing ? (
                    <div className="text-sm">
                      <span aria-label={`${consumedHours} consumed, ongoing contract`}>
                        <strong>{consumedHours}</strong> → <span className="text-muted-foreground">Ongoing</span>
                      </span>
                    </div>
                  ) : (
                    <div className="text-sm">
                      <span aria-label={`${consumedHours} consumed of ${contractedHours} contracted, ${utilizationPercentage} utilization`}>
                        <strong>{consumedHours}</strong> / {contractedHours}
                        <span className="ml-2 text-muted-foreground">({utilizationPercentage})</span>
                      </span>
                    </div>
                  )}
                </div>

                {!utilization.isOngoing && (
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

                {utilization.utilizationPercentage && utilization.utilizationPercentage > 100 && (
                  <p className="text-xs text-destructive" role="alert">
                    Over contracted capacity by {AnalyticsService.formatPercentage(utilization.utilizationPercentage - 100)}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}