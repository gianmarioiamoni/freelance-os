// src/features/admin/AccessRequestsTable.tsx
"use client";

import type { AccessRequestRecord } from "@/domain/access-request/types";
import { Button } from "@/components/ui/button";
import { useState, type JSX } from "react";

type AccessRequestsTableProps = {
  requests: AccessRequestRecord[];
};

export function AccessRequestsTable({
  requests,
}: AccessRequestsTableProps): JSX.Element {
  const [processing, setProcessing] = useState<string | null>(null);

  async function handleReview(
    requestId: string,
    approved: boolean,
  ): Promise<void> {
    setProcessing(requestId);

    try {
      const response = await fetch(`/api/admin/access-requests/${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approved }),
      });

      if (response.ok) {
        window.location.reload();
      } else {
        alert("Failed to process request");
      }
    } catch {
      alert("Error processing request");
    } finally {
      setProcessing(null);
    }
  }

  if (requests.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center">
        <p className="text-sm text-muted-foreground">
          No pending access requests.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border">
      <table className="w-full">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="p-3 text-left text-sm font-medium">Email</th>
            <th className="p-3 text-left text-sm font-medium">Requested</th>
            <th className="p-3 text-right text-sm font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {requests.map((request) => (
            <tr key={request.id} className="border-b last:border-b-0">
              <td className="p-3 text-sm">{request.email}</td>
              <td className="p-3 text-sm text-muted-foreground">
                {new Date(request.requestedAt).toLocaleDateString()}
              </td>
              <td className="p-3 text-right">
                <div className="flex justify-end gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={processing === request.id}
                    onClick={() => {
                      void handleReview(request.id, false);
                    }}
                  >
                    Reject
                  </Button>
                  <Button
                    size="sm"
                    disabled={processing === request.id}
                    onClick={() => {
                      void handleReview(request.id, true);
                    }}
                  >
                    {processing === request.id ? "Processing…" : "Approve"}
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
