// tests/integration/persistence/fixtures.ts
import type { PersistenceRepositories } from "@/domain/repositories";

import { date } from "./helpers";

export type WorkspaceGraph = {
  workspaceId: string;
  userId: string;
  clientId: string;
  contractId: string;
};

export async function createWorkspaceGraph(
  repositories: PersistenceRepositories,
  suffix: string,
): Promise<WorkspaceGraph> {
  const workspace = await repositories.workspaces.createWorkspace({
    name: `Workspace ${suffix}`,
    timezone: "Europe/Rome",
    currency: "EUR",
  });

  const userId = `user-${suffix}`;

  await repositories.members.addMember({
    workspaceId: workspace.id,
    userId,
    role: "OWNER",
  });

  const client = await repositories.clients.createClient(workspace.id, {
    companyName: `Client ${suffix}`,
  });

  const contract = await repositories.contracts.createContract(workspace.id, {
    clientId: client.id,
    validFrom: date("2026-01-01"),
    validTo: date("2026-07-01"),
    billingModel: "HOURLY",
    rate: "80.0000",
    currency: "EUR",
  });

  return {
    workspaceId: workspace.id,
    userId,
    clientId: client.id,
    contractId: contract.id,
  };
}
