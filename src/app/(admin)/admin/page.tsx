// src/app/(admin)/admin/page.tsx
import {
  InvalidAdminConfigurationError,
  UnauthorizedAdminAccessError,
} from "@/application/admin/admin-errors";
import { listUsers, type AdminUserListItem } from "@/application/admin/list-users";
import { PageContent } from "@/components/page/PageContent";
import { PageHeader } from "@/components/page/PageHeader";
import { ErrorState } from "@/components/states/ErrorState";
import { AdminActionNotice } from "@/features/admin/AdminActionNotice";
import { AccessRequestsTable } from "@/features/admin/AccessRequestsTable";
import { UserListTable } from "@/features/admin/UserListTable";
import { listPendingAccessRequests } from "@/infrastructure/access-request/repository";
import type { JSX } from "react";

type AdminPageProps = {
  searchParams: Promise<{
    notice?: string;
  }>;
};

export default async function AdminPage({
  searchParams,
}: AdminPageProps): Promise<JSX.Element> {
  const params = await searchParams;
  let users: AdminUserListItem[];

  try {
    users = await listUsers();
  } catch (error) {
    if (
      error instanceof UnauthorizedAdminAccessError ||
      error instanceof InvalidAdminConfigurationError
    ) {
      return <ErrorState message="Unauthorized admin access." />;
    }
    throw error;
  }

  const accessRequests = await listPendingAccessRequests();

  return (
    <div className="mx-auto w-full max-w-6xl">
      <PageHeader
        title="Admin"
        description="Manage registered users and access requests."
      />
      <PageContent>
        <div className="space-y-8">
          {accessRequests.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-medium">
                Pending Access Requests ({accessRequests.length})
              </h2>
              <AccessRequestsTable requests={accessRequests} />
            </div>
          )}
          <div className="space-y-4">
            <h2 className="text-lg font-medium">User Management</h2>
            <AdminActionNotice notice={params.notice} />
            <UserListTable users={users} />
          </div>
        </div>
      </PageContent>
    </div>
  );
}
