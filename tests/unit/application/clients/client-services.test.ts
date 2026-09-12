// tests/unit/application/clients/client-services.test.ts
import { describe, expect, it } from "vitest";

import { archiveClient } from "@/application/clients/archive-client";
import { createClient } from "@/application/clients/create-client";
import { getClient } from "@/application/clients/get-client";
import { listClients } from "@/application/clients/list-clients";
import { updateClient } from "@/application/clients/update-client";
import type { WorkspaceContext } from "@/application/workspace/workspace-context";
import { ClientNotFoundError } from "@/domain/client-errors";
import { RecordNotFoundError } from "@/domain/persistence-errors";
import type {
  ClientRecord,
  CreateClientInput,
  UpdateClientInput,
} from "@/domain/persistence-types";
import type { ClientRepository } from "@/domain/repositories";

const context: WorkspaceContext = {
  workspaceId: "workspace-trusted",
  userId: "user-1",
  role: "OWNER",
};

function clientRecord(
  overrides: Partial<ClientRecord> = {},
): ClientRecord {
  return {
    id: "client-1",
    workspaceId: context.workspaceId,
    companyName: "Acme Studio",
    vatNumber: null,
    taxCode: null,
    address: null,
    contactName: null,
    email: null,
    phone: null,
    notes: null,
    status: "ACTIVE",
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    ...overrides,
  };
}

function createFakeClientRepository(seed: ClientRecord[] = []) {
  const records = [...seed];
  const calls: {
    create?: { workspaceId: string; input: CreateClientInput };
    list?: { workspaceId: string; status?: ClientRecord["status"] };
    get?: { workspaceId: string; clientId: string };
    update?: { workspaceId: string; clientId: string; input: UpdateClientInput };
    archive?: { workspaceId: string; clientId: string };
  } = {};

  const clients: ClientRepository = {
    async createClient(workspaceId, input) {
      calls.create = { workspaceId, input };
      const record = clientRecord({
        id: `client-${records.length + 1}`,
        workspaceId,
        companyName: input.companyName,
        vatNumber: input.vatNumber ?? null,
        taxCode: input.taxCode ?? null,
        address: input.address ?? null,
        contactName: input.contactName ?? null,
        email: input.email ?? null,
        phone: input.phone ?? null,
        notes: input.notes ?? null,
        status: input.status ?? "ACTIVE",
      });
      records.push(record);
      return record;
    },
    async getClient(workspaceId, clientId) {
      calls.get = { workspaceId, clientId };
      return (
        records.find(
          (row) => row.id === clientId && row.workspaceId === workspaceId,
        ) ?? null
      );
    },
    async listClients(workspaceId, status) {
      calls.list = { workspaceId, status };
      return records.filter(
        (row) =>
          row.workspaceId === workspaceId &&
          (status === undefined || row.status === status),
      );
    },
    async updateClient(workspaceId, clientId, input) {
      calls.update = { workspaceId, clientId, input };
      const index = records.findIndex(
        (row) => row.id === clientId && row.workspaceId === workspaceId,
      );

      if (index === -1) {
        throw new RecordNotFoundError("Client", clientId);
      }

      const current = records[index];
      const updated = clientRecord({
        ...current,
        companyName: input.companyName,
        vatNumber: input.vatNumber ?? null,
        taxCode: input.taxCode ?? null,
        address: input.address ?? null,
        contactName: input.contactName ?? null,
        email: input.email ?? null,
        phone: input.phone ?? null,
        notes: input.notes ?? null,
        workspaceId: current.workspaceId,
        status: current.status,
        updatedAt: new Date("2026-02-01T00:00:00.000Z"),
      });
      records[index] = updated;
      return updated;
    },
    async archiveClient(workspaceId, clientId) {
      calls.archive = { workspaceId, clientId };
      const index = records.findIndex(
        (row) => row.id === clientId && row.workspaceId === workspaceId,
      );

      if (index === -1) {
        throw new RecordNotFoundError("Client", clientId);
      }

      const archived = clientRecord({
        ...records[index],
        status: "ARCHIVED",
      });
      records[index] = archived;
      return archived;
    },
  };

  return { records, calls, clients };
}

describe("client application services", () => {
  it("creates a client from trusted workspace context as ACTIVE", async () => {
    const fake = createFakeClientRepository();

    const created = await createClient(
      context,
      {
        companyName: "  Acme Studio  ",
        vatNumber: "  IT123  ",
        status: "ARCHIVED",
        workspaceId: "workspace-from-form",
      } as Parameters<typeof createClient>[1] & {
        status: "ARCHIVED";
        workspaceId: string;
      },
      fake.clients,
    );

    expect(created.status).toBe("ACTIVE");
    expect(created.workspaceId).toBe("workspace-trusted");
    expect(created.companyName).toBe("Acme Studio");
    expect(created.vatNumber).toBe("IT123");
    expect(fake.calls.create).toEqual({
      workspaceId: "workspace-trusted",
      input: {
        companyName: "Acme Studio",
        vatNumber: "IT123",
        taxCode: null,
        address: null,
        contactName: null,
        email: null,
        phone: null,
        notes: null,
      },
    });
    expect(fake.calls.create?.input).not.toHaveProperty("status");
    expect(fake.calls.create?.input).not.toHaveProperty("workspaceId");
  });

  it("lists clients using workspaceId from WorkspaceContext", async () => {
    const fake = createFakeClientRepository([
      clientRecord(),
      clientRecord({
        id: "client-foreign",
        workspaceId: "workspace-other",
      }),
    ]);

    const listed = await listClients(context, fake.clients, "ACTIVE");

    expect(listed).toHaveLength(1);
    expect(listed[0]?.id).toBe("client-1");
    expect(fake.calls.list).toEqual({
      workspaceId: "workspace-trusted",
      status: "ACTIVE",
    });
  });

  it("gets a client using workspaceId from WorkspaceContext", async () => {
    const fake = createFakeClientRepository([clientRecord()]);

    const found = await getClient(context, "client-1", fake.clients);

    expect(found.id).toBe("client-1");
    expect(fake.calls.get).toEqual({
      workspaceId: "workspace-trusted",
      clientId: "client-1",
    });
  });

  it("updates a client using workspaceId from WorkspaceContext", async () => {
    const fake = createFakeClientRepository([clientRecord()]);

    const updated = await updateClient(
      context,
      "client-1",
      { companyName: "  Renamed Studio  ", email: "ops@acme.test" },
      fake.clients,
    );

    expect(updated.companyName).toBe("Renamed Studio");
    expect(updated.email).toBe("ops@acme.test");
    expect(updated.status).toBe("ACTIVE");
    expect(updated.workspaceId).toBe("workspace-trusted");
    expect(fake.calls.update).toEqual({
      workspaceId: "workspace-trusted",
      clientId: "client-1",
      input: {
        companyName: "Renamed Studio",
        vatNumber: null,
        taxCode: null,
        address: null,
        contactName: null,
        email: "ops@acme.test",
        phone: null,
        notes: null,
      },
    });
  });

  it("archives a client using workspaceId from WorkspaceContext", async () => {
    const fake = createFakeClientRepository([clientRecord()]);

    const archived = await archiveClient(context, "client-1", fake.clients);

    expect(archived.status).toBe("ARCHIVED");
    expect(fake.calls.archive).toEqual({
      workspaceId: "workspace-trusted",
      clientId: "client-1",
    });
  });

  it("returns not found for an unknown client on get", async () => {
    const fake = createFakeClientRepository();

    await expect(getClient(context, "missing", fake.clients)).rejects.toBeInstanceOf(
      ClientNotFoundError,
    );
  });

  it("returns not found for an unknown client on update", async () => {
    const fake = createFakeClientRepository();

    await expect(
      updateClient(context, "missing", { companyName: "Ghost" }, fake.clients),
    ).rejects.toBeInstanceOf(ClientNotFoundError);
  });

  it("returns not found for an unknown client on archive", async () => {
    const fake = createFakeClientRepository();

    await expect(archiveClient(context, "missing", fake.clients)).rejects.toBeInstanceOf(
      ClientNotFoundError,
    );
  });

  it("treats a foreign-workspace client as not found", async () => {
    const fake = createFakeClientRepository([
      clientRecord({ id: "client-foreign", workspaceId: "workspace-other" }),
    ]);

    await expect(
      getClient(context, "client-foreign", fake.clients),
    ).rejects.toBeInstanceOf(ClientNotFoundError);
    await expect(
      updateClient(
        context,
        "client-foreign",
        { companyName: "Hijack" },
        fake.clients,
      ),
    ).rejects.toBeInstanceOf(ClientNotFoundError);
    await expect(
      archiveClient(context, "client-foreign", fake.clients),
    ).rejects.toBeInstanceOf(ClientNotFoundError);
  });
});
