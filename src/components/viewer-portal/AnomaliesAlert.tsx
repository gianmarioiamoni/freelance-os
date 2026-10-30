// src/components/viewer-portal/AnomaliesAlert.tsx
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { JSX } from "react";

type AnomaliesAlertProps = {
  pendingCount: number;
};

export function AnomaliesAlert({
  pendingCount,
}: AnomaliesAlertProps): JSX.Element | null {
  if (pendingCount === 0) {
    return null;
  }

  return (
    <Alert className="border-orange-200 bg-orange-50">
      <AlertDescription>
        <strong className="font-semibold">
          {pendingCount} anomal{pendingCount === 1 ? "y" : "ies"}
        </strong>{" "}
        pending review
      </AlertDescription>
    </Alert>
  );
}
