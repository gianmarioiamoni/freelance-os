// src/components/viewer-portal/SimpleDailyBars.tsx
import { AnalyticsService } from "@/application/analytics/analytics-service";
import type { JSX } from "react";

type DailyData = {
  workDate: Date;
  totalMinutes: number;
  billableMinutes: number;
  entriesCount: number;
};

type SimpleDailyBarsProps = {
  dailyData: DailyData[];
};

export function SimpleDailyBars({
  dailyData,
}: SimpleDailyBarsProps): JSX.Element {
  if (dailyData.length === 0) {
    return (
      <div className="text-sm text-muted-foreground text-center py-8">
        No activity in this period
      </div>
    );
  }

  const maxMinutes = Math.max(...dailyData.map((d) => d.totalMinutes));

  return (
    <div className="space-y-2">
      {dailyData.map((day) => {
        const heightPercent = (day.totalMinutes / maxMinutes) * 100;
        const billablePercent =
          day.totalMinutes > 0
            ? (day.billableMinutes / day.totalMinutes) * 100
            : 0;
        const formattedDate = day.workDate.toLocaleDateString("en-US", {
          day: "2-digit",
          month: "short",
        });

        return (
          <div
            key={day.workDate.toISOString()}
            className="flex items-center gap-2"
          >
            <div className="w-16 text-sm text-muted-foreground">
              {formattedDate}
            </div>
            <div className="flex-1 flex items-center gap-2">
              <div
                className="h-8 bg-primary rounded transition-all"
                style={{ width: `${heightPercent}%` }}
                title={`${AnalyticsService.formatDuration(day.totalMinutes)} (${Math.round(billablePercent)}% billable)`}
              />
              <span className="text-xs text-muted-foreground min-w-[50px]">
                {AnalyticsService.formatDuration(day.totalMinutes)}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
