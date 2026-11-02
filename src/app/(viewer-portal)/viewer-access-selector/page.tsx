// src/app/(viewer-portal)/viewer-access-selector/page.tsx
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { getServerAuthSession } from "@/infrastructure/auth/session";
import { createRepositories } from "@/infrastructure/persistence/create-repositories";
import { redirect } from "next/navigation";
import Link from "next/link";
import type { JSX } from "react";

export default async function ViewerAccessSelectorPage(): Promise<JSX.Element> {
  const session = await getServerAuthSession();

  if (!session) {
    redirect("/viewer-login");
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
            <CardTitle>No Active Access</CardTitle>
            <CardDescription>
              You don&apos;t have any active timesheet viewer access.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert className="mb-4">
              <AlertTitle>No Timesheet Access Found</AlertTitle>
              <AlertDescription>
                Please contact the workspace owner for an invitation.
              </AlertDescription>
            </Alert>
            <Link href="/viewer-login">
              <Button variant="outline" className="w-full">Back to Sign In</Button>
            </Link>
          </CardContent>
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
            You have access to multiple timesheets. Select one to view.
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
                  Activated: {access.activatedAt ? new Date(access.activatedAt).toLocaleDateString() : "N/A"}
                </div>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
