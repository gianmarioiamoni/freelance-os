// tests/unit/application/ai/resolve-ai-entity.test.ts
import { describe, expect, it } from "vitest";

import { AiClarificationError } from "@/application/ai/ai-errors";
import { resolveClientReference } from "@/application/ai/resolve-ai-entity";
import { ClientNotFoundError } from "@/domain/client-errors";

import { clientRecord, workspaceContext } from "./ai-test-helpers";

describe("resolveClientReference", () => {
  it("resolves a single case-insensitive exact name", async () => {
    const resolved = await resolveClientReference(
      workspaceContext(),
      { clientName: "acme" },
      {
        listClients: async () => [clientRecord({ companyName: "ACME" })],
        getClient: async () => {
          throw new Error("must not invent an id lookup");
        },
      },
    );

    expect(resolved).toEqual({ clientId: "client-1", companyName: "ACME" });
  });

  it("requires clarification when two clients share the same name", async () => {
    await expect(
      resolveClientReference(
        workspaceContext(),
        { clientName: "ACME" },
        {
          listClients: async () => [
            clientRecord({ id: "client-a", companyName: "ACME" }),
            clientRecord({ id: "client-b", companyName: "ACME" }),
          ],
          getClient: async () => {
            throw new Error("must not pick");
          },
        },
      ),
    ).rejects.toMatchObject({ clarificationClass: "ambiguous_entity" });
  });

  it("does not accept a foreign id without the workspace getClient", async () => {
    await expect(
      resolveClientReference(
        workspaceContext(),
        { clientId: "client-foreign" },
        {
          listClients: async () => [],
          getClient: async () => {
            throw new ClientNotFoundError();
          },
        },
      ),
    ).rejects.toBeInstanceOf(ClientNotFoundError);
  });

  it("returns unknown_entity for a missing name", async () => {
    await expect(
      resolveClientReference(
        workspaceContext(),
        { clientName: "Missing Co" },
        {
          listClients: async () => [clientRecord()],
          getClient: async () => {
            throw new Error("unused");
          },
        },
      ),
    ).rejects.toBeInstanceOf(AiClarificationError);
  });
});
