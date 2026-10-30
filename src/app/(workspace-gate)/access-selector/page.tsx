// src/app/(workspace-gate)/access-selector/page.tsx
import { SIGN_IN_PATH, DEFAULT_AUTHENTICATED_PATH } from "@/application/auth/route-access";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getServerAuthSession } from "@/infrastructure/auth/session";
import { createRepositories } from "@/infrastructure/persistence/create-repositories";
import { redirect } from "next/navigation";
import Link from "next/link";
import type { JSX } from "react";

export default async function AccessSelectorPage(): Promise<JSX.Element> {
  const session = await getServerAuthSession();

  if (!session) {
    redirect(SIGN_IN_PATH);
  }

  const repositories = createRepositories();

  const workspaceMemberships = await repositories.members.listForUser(
    session.user.id,
  );
  const viewerAccesses = await repositories.viewerAccess.listForUser(
    session.user.id,
    "ACTIVE",
  );

  // If only freelance access, redirect to default path
  if (workspaceMemberships.length > 0 && viewerAccesses.length === 0) {
    redirect(DEFAULT_AUTHENTICATED_PATH);
  }

  // If only one viewer access and no freelance, redirect directly
  if (workspaceMemberships.length === 0 && viewerAccesses.length === 1) {
    const access = viewerAccesses[0];
    redirect(
      `/viewer-dashboard?workspaceId=${access.workspaceId}&viewerAccessId=${access.id}`,
    );
  }

  // If neither, show error
  if (workspaceMemberships.length === 0 && viewerAccesses.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>No Access</CardTitle>
            <CardDescription>
              You do not have access to any workspace or viewer portal.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // Show selector for both types of access
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Select Access Type</CardTitle>
          <CardDescription>
            You have access to both workspace and viewer portals. Select one to continue.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {workspaceMemberships.length > 0 && (
            <div>
              <h3 className="font-semibold mb-2">Workspace Access</h3>
              <Link href={DEFAULT_AUTHENTICATED_PATH}>
                <Button className="w-full" variant="default">
                  Go to Workspace Dashboard
                </Button>
              </Link>
            </div>
          )}

          {viewerAccesses.length > 0 && (
            <div>
              <h3 className="font-semibold mb-2">Viewer Access</h3>
              <div className="space-y-2">
                {viewerAccesses.map((access) => (
                  <Link
                    key={access.id}
                    href={`/viewer-dashboard?workspaceId=${access.workspaceId}&viewerAccessId=${access.id}`}
                  >
                    <Button className="w-full" variant="outline">
                      {access.email}
                    </Button>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
