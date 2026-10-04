// src/features/admin/DeleteImpactPreview.tsx
import type { DeleteImpactAnalysis } from "@/application/admin/analyze-user-delete-impact";
import { AlertCircle } from "lucide-react";
import type { JSX } from "react";

type DeleteImpactPreviewProps = {
  userName: string;
  userEmail: string;
  impact: DeleteImpactAnalysis;
};

export function DeleteImpactPreview({
  userName,
  userEmail,
  impact,
}: DeleteImpactPreviewProps): JSX.Element {
  const soleOwnerWorkspaces = impact.workspaces.filter(
    (workspace) => workspace.willBeDeleted,
  );
  const preservedWorkspaces = impact.workspaces.filter(
    (workspace) => !workspace.willBeDeleted,
  );

  return (
    <div className="space-y-4">
      <div className="rounded-md border p-3">
        <p className="text-sm font-medium">User</p>
        <p className="text-sm text-muted-foreground">{userName}</p>
        <p className="text-sm text-muted-foreground">{userEmail}</p>
      </div>

      {soleOwnerWorkspaces.length > 0 ? (
        <div className="rounded-md border border-destructive/50 bg-destructive/5 p-3">
          <div className="mb-2 flex items-center gap-2">
            <AlertCircle aria-hidden="true" className="h-4 w-4 text-destructive" />
            <p className="text-sm font-semibold text-destructive">
              Workspaces That Will Be Deleted
            </p>
          </div>
          <p className="mb-3 text-sm text-muted-foreground">
            These workspaces and all their data will be permanently deleted
            because this user is the sole owner.
          </p>
          <ul className="space-y-1">
            {soleOwnerWorkspaces.map((workspace) => (
              <li key={workspace.workspaceId} className="text-sm">
                {workspace.workspaceName}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {preservedWorkspaces.length > 0 ? (
        <div className="rounded-md border bg-muted/30 p-3">
          <p className="mb-2 text-sm font-medium">
            Workspaces That Will Be Preserved
          </p>
          <p className="mb-3 text-sm text-muted-foreground">
            These workspaces will remain because another OWNER exists.
          </p>
          <ul className="space-y-1">
            {preservedWorkspaces.map((workspace) => (
              <li key={workspace.workspaceId} className="text-sm">
                {workspace.workspaceName}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {impact.workspaces.length === 0 ? (
        <div className="rounded-md border bg-muted/30 p-3">
          <p className="text-sm text-muted-foreground">
            This user has no workspaces. No workspace will be deleted.
          </p>
        </div>
      ) : null}

      <div className="rounded-md border border-destructive/50 bg-destructive/5 p-3">
        <p className="text-sm font-semibold text-destructive">Warning</p>
        <p className="text-sm text-muted-foreground">
          This action cannot be undone through the Admin UI. Sole-owner
          workspaces will be permanently deleted.
        </p>
      </div>
    </div>
  );
}
