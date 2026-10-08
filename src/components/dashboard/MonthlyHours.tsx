// src/components/dashboard/MonthlyHours.tsx
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/states/EmptyState";
import { AnalyticsService } from "@/application/analytics/analytics-service";
import type { MonthlyHoursAllocation } from "@/domain/analytics-types";
import type { JSX } from "react";

type MonthlyHoursProps = {
  allocations: MonthlyHoursAllocation[];
};

export function MonthlyHours({ allocations }: MonthlyHoursProps): JSX.Element {
  if (allocations.length === 0) {
    return (
      <Card>
        <CardHeader>
          <h2 className="font-heading text-base leading-snug font-medium group-data-[size=sm]/card:text-sm">
            Monthly Hours
          </h2>
        </CardHeader>
        <CardContent>
          <EmptyState
            title="No monthly capacity set"
            description="Set monthly contracted hours for contracts to track monthly hours."
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <h2 className="font-heading text-base leading-snug font-medium group-data-[size=sm]/card:text-sm">
          Monthly Hours
        </h2>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {allocations.map((allocation) => {
            const workedHours = AnalyticsService.formatDuration(allocation.workedMinutes);
            const allocatedHours = allocation.allocatedMinutes 
              ? AnalyticsService.formatDuration(allocation.allocatedMinutes)
              : null;
            const percentage = allocation.percentage !== null 
              ? AnalyticsService.formatPercentage(allocation.percentage)
              : null;
            
            // Determine if allocation is exceeded or near limit
            const isExceeded = allocation.percentage !== null && allocation.percentage > 100;
            const isWarning = allocation.percentage !== null && allocation.percentage > 80 && allocation.percentage <= 100;
            
            return (
              <div key={allocation.contractId} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    <h3 className="min-w-0 flex-1 font-medium">
                      <span className="block truncate" title={allocation.clientName}>
                        {allocation.clientName}
                      </span>
                    </h3>
                    {allocation.isArchived ? (
                      <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                        Archived
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span aria-label={`${workedHours} worked of ${allocatedHours} allocated for ${allocation.clientName}`}>
                    <strong>{workedHours}</strong> / {allocatedHours} allocated
                  </span>
                  {percentage && (
                    <span className={isExceeded ? "text-destructive font-medium" : undefined}>
                      {percentage}
                    </span>
                  )}
                </div>

                {/* Progress bar */}
                <div 
                  className="h-2 bg-muted rounded-full overflow-hidden"
                  role="progressbar"
                  aria-valuenow={allocation.percentage || 0}
                  aria-valuemax={100}
                  aria-label={`${allocation.clientName}: ${percentage} of monthly allocation`}
                >
                  <div 
                    className={`h-full transition-all duration-300 ${
                      isExceeded
                        ? 'bg-destructive' 
                        : isWarning
                          ? 'bg-warning' 
                          : 'bg-primary'
                    }`}
                    style={{ 
                      width: `${Math.min(allocation.percentage || 0, 100)}%` 
                    }}
                  />
                </div>

                {/* Status message */}
                {isExceeded && allocation.percentage !== null ? (
                  <p className="text-xs text-destructive" role="alert">
                    Over monthly allocation by {AnalyticsService.formatPercentage(allocation.percentage - 100)}
                  </p>
                ) : isWarning ? (
                  <p className="text-xs text-warning">Approaching monthly allocation limit</p>
                ) : (
                  <p className="text-xs text-muted-foreground">Within monthly allocation</p>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
