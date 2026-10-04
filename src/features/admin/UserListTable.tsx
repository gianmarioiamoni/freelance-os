// src/features/admin/UserListTable.tsx
import type { AdminUserListItem } from "@/application/admin/list-users";
import { EmptyState } from "@/components/states/EmptyState";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { UserActions } from "@/features/admin/UserActions";
import { UserStatus } from "@/features/admin/UserStatus";
import type { JSX } from "react";

type UserListTableProps = {
  users: AdminUserListItem[];
};

export function UserListTable({ users }: UserListTableProps): JSX.Element {
  if (users.length === 0) {
    return (
      <EmptyState
        title="No users found"
        description="Registered users will appear here."
      />
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableCaption className="sr-only">Registered users</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead scope="col">Name</TableHead>
            <TableHead scope="col">Email</TableHead>
            <TableHead scope="col">Status</TableHead>
            <TableHead scope="col">Registered</TableHead>
            <TableHead scope="col" className="text-right">
              Actions
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id}>
              <TableCell className="font-medium">
                {user.name}
                {user.isAdmin ? (
                  <span className="ml-2 text-xs text-muted-foreground">
                    (Admin)
                  </span>
                ) : null}
              </TableCell>
              <TableCell>{user.email}</TableCell>
              <TableCell>
                <UserStatus user={user} />
              </TableCell>
              <TableCell>
                {new Date(user.createdAt).toLocaleDateString()}
              </TableCell>
              <TableCell className="text-right">
                <UserActions user={user} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
