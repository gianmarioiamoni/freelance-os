// src/app/(viewer-portal)/viewer-access-selector/page.tsx
import { SIGN_IN_PATH } from "@/application/auth/route-access";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getServerAuthSession } from "@/infrastructure/auth/session";
import { createRepositories } from "@/infrastructure/persistence/create-repositories";
import { redirect } from "next/navigation";
import Link from "next/link";
import type { JSX } from "react";

export default async function ViewerAccessSelectorPage(): Promise<JSX.Element> {
  const session = await getServerAuthSession();

  if (!session) {
    redirect(SIGN_IN_PATH);
  }

  const repositories = createRepositories();

  const viewerAccesses = await repositories.viewerAccess.listForUser(
    session.user.id,
    "ACTIVE",
  );

  if (viewerAccesses.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>No Active Viewer Access</CardTitle>
            <CardDescription>
              You do not have any active viewer access.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (viewerAccesses.length === 1) {
    const access = viewerAccesses[0];
    redirect(
      `/viewer-dashboard?workspaceId=${access.workspaceId}&viewerAccessId=${access.id}`,
    );
  }

  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Select Viewer Access</CardTitle>
          <CardDescription>
            You have access to multiple workspaces. Select one to continue.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {viewerAccesses.map((access) => (
              <Link
                key={access.id}
                href={`/viewer-dashboard?workspaceId=${access.workspaceId}&viewerAccessId=${access.id}`}
                className="block p-4 border rounded-lg hover:bg-accent transition-colors"
              >
                <div className="font-medium">{access.email}</div>
                <div className="text-sm text-muted-foreground">
                  Workspace ID: {access.workspaceId}
                </div>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
