// tests/integration/persistence/seed.test.ts
import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { prisma } from "./helpers";

const execFileAsync = promisify(execFile);
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

const SEED_WORKSPACE_ID = "11111111-1111-4111-8111-111111111111";

async function runSeed(): Promise<void> {
  await execFileAsync("pnpm", ["db:seed"], {
    cwd: projectRoot,
    env: {
      ...process.env,
      DATABASE_URL: process.env.TEST_DATABASE_URL,
    },
  });
}

async function seedCounts(): Promise<Record<string, number>> {
  const [workspaces, members, clients, contracts, timeEntries, settings, alerts, notifications] =
    await Promise.all([
      prisma.workspace.count(),
      prisma.workspaceMember.count(),
      prisma.client.count(),
      prisma.contract.count(),
      prisma.timeEntry.count(),
      prisma.workspaceSettings.count(),
      prisma.alert.count(),
      prisma.notification.count(),
    ]);

  return {
    workspaces,
    members,
    clients,
    contracts,
    timeEntries,
    settings,
    alerts,
    notifications,
  };
}

describe("development seed", () => {
  it("creates the documented synthetic dataset and is idempotent", async () => {
    await runSeed();

    const first = await seedCounts();
    const workspace = await prisma.workspace.findUnique({
      where: { id: SEED_WORKSPACE_ID },
      include: {
        members: true,
        clients: { include: { contracts: true } },
        alerts: true,
        notifications: true,
      },
    });

    expect(first).toEqual({
      workspaces: 1,
      members: 2,
      clients: 3,
      contracts: 4,
      timeEntries: 8,
      settings: 1,
      alerts: 2,
      notifications: 2,
    });
    expect(workspace?.clients).toHaveLength(3);
    expect(workspace?.alerts.every((alert) => alert.workspaceId === SEED_WORKSPACE_ID)).toBe(true);
    expect(workspace?.notifications.every((notification) => notification.alertId !== null)).toBe(true);

    await runSeed();
    expect(await seedCounts()).toEqual(first);
  });
});
