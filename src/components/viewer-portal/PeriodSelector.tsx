// src/components/viewer-portal/PeriodSelector.tsx
"use client";

import { useRouter, useSearchParams } from "next/navigation";
import type { JSX } from "react";

type PeriodSelectorProps = {
  workspaceId: string;
  viewerAccessId: string;
};

export function PeriodSelector({
  workspaceId,
  viewerAccessId,
}: PeriodSelectorProps): JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentMonth = parseInt(
    searchParams.get("month") || String(new Date().getMonth() + 1),
    10,
  );
  const currentYear = parseInt(
    searchParams.get("year") || String(new Date().getFullYear()),
    10,
  );

  function handleMonthChange(month: number): void {
    const url = new URL(window.location.href);
    url.searchParams.set("workspaceId", workspaceId);
    url.searchParams.set("viewerAccessId", viewerAccessId);
    url.searchParams.set("month", String(month));
    url.searchParams.set("year", String(currentYear));
    router.push(url.pathname + url.search);
  }

  function handleYearChange(year: number): void {
    const url = new URL(window.location.href);
    url.searchParams.set("workspaceId", workspaceId);
    url.searchParams.set("viewerAccessId", viewerAccessId);
    url.searchParams.set("month", String(currentMonth));
    url.searchParams.set("year", String(year));
    router.push(url.pathname + url.search);
  }

  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const years = Array.from({ length: 3 }, (_, i) => currentYear - i);

  return (
    <div className="flex gap-4">
      <div>
        <label
          htmlFor="month-selector"
          className="block text-sm font-medium text-muted-foreground mb-1"
        >
          Month
        </label>
        <select
          id="month-selector"
          className="border rounded px-3 py-2 text-sm"
          value={currentMonth}
          onChange={(e) => handleMonthChange(parseInt(e.target.value, 10))}
        >
          {months.map((month, index) => (
            <option key={index} value={index + 1}>
              {month}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label
          htmlFor="year-selector"
          className="block text-sm font-medium text-muted-foreground mb-1"
        >
          Year
        </label>
        <select
          id="year-selector"
          className="border rounded px-3 py-2 text-sm"
          value={currentYear}
          onChange={(e) => handleYearChange(parseInt(e.target.value, 10))}
        >
          {years.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
