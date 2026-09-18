// src/features/clients/ClientDetail.tsx
import { ArchiveClientForm } from "@/features/clients/ArchiveClientForm";
import {
  displayOptionalText,
  formatClientStatus,
} from "@/features/clients/client-status";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ClientRecord } from "@/domain/persistence-types";
import Link from "next/link";
import type { JSX } from "react";

type ClientDetailProps = {
  client: ClientRecord;
  isConfirmingArchive: boolean;
};

const DETAIL_FIELDS = [
  { label: "Company name", getValue: (client: ClientRecord) => client.companyName },
  {
    label: "VAT number",
    getValue: (client: ClientRecord) => displayOptionalText(client.vatNumber),
  },
  {
    label: "Tax code",
    getValue: (client: ClientRecord) => displayOptionalText(client.taxCode),
  },
  {
    label: "Address",
    getValue: (client: ClientRecord) => displayOptionalText(client.address),
  },
  {
    label: "Contact name",
    getValue: (client: ClientRecord) => displayOptionalText(client.contactName),
  },
  {
    label: "Email",
    getValue: (client: ClientRecord) => displayOptionalText(client.email),
  },
  {
    label: "Phone",
    getValue: (client: ClientRecord) => displayOptionalText(client.phone),
  },
  {
    label: "Notes",
    getValue: (client: ClientRecord) => displayOptionalText(client.notes),
  },
  {
    label: "Status",
    getValue: (client: ClientRecord) => formatClientStatus(client.status),
  },
] as const;

export function ClientDetail({
  client,
  isConfirmingArchive,
}: ClientDetailProps): JSX.Element {
  const isActive = client.status === "ACTIVE";

  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Master data</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4">
            {DETAIL_FIELDS.map((field) => (
              <div key={field.label} className="grid gap-1">
                <dt className="text-sm text-muted-foreground">{field.label}</dt>
                <dd>{field.getValue(client)}</dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>
      <div className="flex flex-wrap gap-2">
        <Button asChild>
          <Link href={`/clients/${client.id}/edit`}>Edit</Link>
        </Button>
        {isActive && !isConfirmingArchive ? (
          <Button asChild variant="destructive">
            <a href={`/clients/${client.id}?confirm=archive`}>Archive</a>
          </Button>
        ) : null}
      </div>
      {isActive && isConfirmingArchive ? (
        <ArchiveClientForm clientId={client.id} />
      ) : null}
    </div>
  );
}
