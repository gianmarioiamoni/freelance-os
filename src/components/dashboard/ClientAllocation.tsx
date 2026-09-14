// src/components/dashboard/ClientAllocation.tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/states/EmptyState";
import { AnalyticsService } from "@/application/analytics/analytics-service";
import type { ClientAllocation } from "@/domain/analytics-types";
import type { JSX } from "react";

type ClientAllocationProps = {
  allocations: ClientAllocation[];
};

export function ClientAllocation({ allocations }: ClientAllocationProps): JSX.Element {
  if (allocations.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle role="heading" aria-level={2}>Client Allocation</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            title="No client time tracked"
            description="Time allocation will appear here once you start logging time for clients."
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle role="heading" aria-level={2}>Client Allocation</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {allocations.map((allocation) => {
            const totalHours = AnalyticsService.formatDuration(allocation.totalMinutes);
            const billableHours = AnalyticsService.formatDuration(allocation.billableMinutes);
            const percentage = AnalyticsService.formatPercentage(allocation.percentage);
            
            return (
              <div key={allocation.clientId} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <h3 className="font-medium truncate">
                      {allocation.clientName}
                      {allocation.isArchived && (
                        <span className="ml-2 text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                          Archived
                        </span>
                      )}
                    </h3>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {percentage}
                  </div>
                </div>

                <div className="flex items-center gap-4 text-sm">
                  <span aria-label={`${totalHours} total hours for ${allocation.clientName}`}>
                    <strong>{totalHours}</strong> total
                  </span>
                  <span className="text-muted-foreground" aria-label={`${billableHours} billable hours for ${allocation.clientName}`}>
                    {billableHours} billable
                  </span>
                </div>

                {/* Progress bar */}
                <div 
                  className="h-2 bg-muted rounded-full overflow-hidden"
                  role="progressbar"
                  aria-valuenow={allocation.percentage || 0}
                  aria-valuemax={100}
                  aria-label={`${allocation.clientName}: ${percentage} of total time`}
                >
                  <div 
                    className="h-full bg-primary transition-all duration-300"
                    style={{ width: `${allocation.percentage || 0}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}