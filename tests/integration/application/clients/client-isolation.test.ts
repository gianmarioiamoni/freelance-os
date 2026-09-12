// tests/integration/application/clients/client-isolation.test.ts
import { describe, expect, it } from "vitest";

import { archiveClient } from "@/application/clients/archive-client";
import { createClient } from "@/application/clients/create-client";
import { getClient } from "@/application/clients/get-client";
import { listClients } from "@/application/clients/list-clients";
import { updateClient } from "@/application/clients/update-client";
import { createFirstWorkspace } from "@/application/workspace/create-first-workspace";
import type { WorkspaceContext } from "@/application/workspace/workspace-context";
import { ClientNotFoundError } from "@/domain/client-errors";

import { repositories, runInTransaction } from "../../persistence/helpers";

const workspaceInput = {
  timezone: "Europe/Rome",
  currency: "EUR",
} as const;

async function createWorkspaceContext(
  suffix: string,
): Promise<WorkspaceContext> {
  const created = await createFirstWorkspace(
    `client-iso-${suffix}`,
    { ...workspaceInput, name: `Workspace ${suffix}` },
    { runInTransaction },
  );

  return created.context;
}

async function createIsolatedClients() {
  const contextA = await createWorkspaceContext("A");
  const contextB = await createWorkspaceContext("B");

  const clientA = await createClient(
    contextA,
    { companyName: "Client A" },
    repositories.clients,
  );
  const clientB = await createClient(
    contextB,
    { companyName: "Client B" },
    repositories.clients,
  );

  return { contextA, contextB, clientA, clientB };
}

describe("client application isolation", () => {
  it("persists allowed master-data fields without changing workspace or status", async () => {
    const contextA = await createWorkspaceContext("update-a");
    const contextB = await createWorkspaceContext("update-b");

    const created = await createClient(
      contextA,
      {
        companyName: "Original Studio",
        vatNumber: "IT111",
        email: "old@studio.test",
        notes: "before",
      },
      repositories.clients,
    );

    const updated = await updateClient(
      contextA,
      created.id,
      {
        companyName: "Updated Studio",
        vatNumber: "IT222",
        taxCode: "TAX222",
        address: "Via Update 1",
        contactName: "Updated Contact",
        email: "new@studio.test",
        phone: "011222",
        notes: "after",
        workspaceId: contextB.workspaceId,
        status: "ARCHIVED",
      } as Parameters<typeof updateClient>[2] & {
        workspaceId: string;
        status: "ARCHIVED";
      },
      repositories.clients,
    );

    expect(updated).toMatchObject({
      id: created.id,
      workspaceId: contextA.workspaceId,
      companyName: "Updated Studio",
      vatNumber: "IT222",
      taxCode: "TAX222",
      address: "Via Update 1",
      contactName: "Updated Contact",
      email: "new@studio.test",
      phone: "011222",
      notes: "after",
      status: "ACTIVE",
    });
    expect(updated.workspaceId).not.toBe(contextB.workspaceId);

    const persisted = await getClient(
      contextA,
      created.id,
      repositories.clients,
    );

    expect(persisted).toMatchObject({
      workspaceId: contextA.workspaceId,
      companyName: "Updated Studio",
      status: "ACTIVE",
    });
  });

  it("denies identifier substitution against a foreign-workspace client", async () => {
    const { contextA, contextB, clientA, clientB } = await createIsolatedClients();

    await expect(
      getClient(contextB, clientA.id, repositories.clients),
    ).rejects.toBeInstanceOf(ClientNotFoundError);
    await expect(
      updateClient(
        contextB,
        clientA.id,
        { companyName: "Hijack" },
        repositories.clients,
      ),
    ).rejects.toBeInstanceOf(ClientNotFoundError);
    await expect(
      archiveClient(contextB, clientA.id, repositories.clients),
    ).rejects.toBeInstanceOf(ClientNotFoundError);

    const listedB = await listClients(contextB, repositories.clients);
    expect(listedB).toHaveLength(1);
    expect(listedB[0]?.id).toBe(clientB.id);
    expect(listedB[0]?.workspaceId).toBe(contextB.workspaceId);
    expect(listedB.some((row) => row.id === clientA.id)).toBe(false);

    const unchanged = await getClient(
      contextA,
      clientA.id,
      repositories.clients,
    );
    expect(unchanged).toMatchObject({
      id: clientA.id,
      workspaceId: contextA.workspaceId,
      companyName: "Client A",
      status: "ACTIVE",
    });

    const own = await getClient(contextB, clientB.id, repositories.clients);
    expect(own.id).toBe(clientB.id);
    expect(own.status).toBe("ACTIVE");
  });
});
