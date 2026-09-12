// src/features/clients/ClientList.tsx
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatClientStatus } from "@/features/clients/client-status";
import type { ClientRecord } from "@/domain/persistence-types";
import Link from "next/link";
import type { JSX } from "react";

type ClientListProps = {
  clients: ClientRecord[];
};

export function ClientList({ clients }: ClientListProps): JSX.Element {
  return (
    <ul className="grid gap-3">
      {clients.map((client) => (
        <li key={client.id}>
          <Card>
            <CardHeader>
              <CardTitle>
                <Link
                  href={`/clients/${client.id}`}
                  className="underline-offset-4 hover:underline"
                >
                  {client.companyName}
                </Link>
              </CardTitle>
              <CardDescription>{formatClientStatus(client.status)}</CardDescription>
            </CardHeader>
            {client.email ? (
              <CardContent>
                <p className="text-muted-foreground">{client.email}</p>
              </CardContent>
            ) : null}
          </Card>
        </li>
      ))}
    </ul>
  );
}
