// tests/integration/application/timesheet-viewer-pending-management.test.ts
import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/infrastructure/prisma/client";
import type { WorkspaceContext } from "@/application/workspace/workspace-context";
import { inviteViewer } from "@/application/timesheet-viewer/invite-viewer";
import { authorizeContract } from "@/application/timesheet-viewer/authorize-contract";
import { revokeContractAccess } from "@/application/timesheet-viewer/revoke-contract-access";
import { activateViewer } from "@/application/timesheet-viewer/activate-viewer";
import {
  createRepositories,
  runInTransaction,
} from "@/infrastructure/persistence/create-repositories";
import { ViewerAccessNotFoundError } from "@/domain/viewer-errors";
import { ContractNotFoundError } from "@/domain/contract-errors";

const WORKSPACE_ID = "11111111-1111-4111-8111-111111111111";
const USER_ID = "22222222-2222-4222-8222-222222222222";
const CLIENT_ID = "33333333-3333-4333-8333-333333333333";
const CONTRACT_A_ID = "44444444-4444-4444-8444-444444444444";
const CONTRACT_B_ID = "55555555-5555-4555-8555-555555555555";

async function setupTestData() {
  await prisma.workspace.create({
    data: {
      id: WORKSPACE_ID,
      name: "Test Workspace",
      timezone: "UTC",
      currency: "EUR",
    },
  });

  await prisma.workspaceMember.create({
    data: {
      workspaceId: WORKSPACE_ID,
      userId: USER_ID,
      role: "OWNER",
    },
  });

  await prisma.client.create({
    data: {
      id: CLIENT_ID,
      workspaceId: WORKSPACE_ID,
      companyName: "Test Client",
      status: "ACTIVE",
    },
  });

  await prisma.contract.create({
    data: {
      id: CONTRACT_A_ID,
      workspaceId: WORKSPACE_ID,
      clientId: CLIENT_ID,
      validFrom: new Date("2026-01-01"),
      validTo: new Date("2026-06-30"),
      billingModel: "HOURLY",
      rate: "50.00",
      currency: "EUR",
      commitmentMode: "PERCENTAGE",
      commitmentPercentage: 0,
      allocatedMinutes: null,
    },
  });

  await prisma.contract.create({
    data: {
      id: CONTRACT_B_ID,
      workspaceId: WORKSPACE_ID,
      clientId: CLIENT_ID,
      validFrom: new Date("2026-07-01"),
      billingModel: "HOURLY",
      rate: "60.00",
      currency: "EUR",
      commitmentMode: "PERCENTAGE",
      commitmentPercentage: 0,
      allocatedMinutes: null,
    },
  });
}

beforeEach(async () => {
  await setupTestData();
});

const context: WorkspaceContext = {
  workspaceId: WORKSPACE_ID,
  userId: USER_ID,
  role: "OWNER",
  timezone: "UTC",
};

describe("PENDING Viewer Contract Management", () => {
  it("allows adding contracts to PENDING viewer", async () => {
    const repos = createRepositories();

    const invited = await inviteViewer(
      context,
      { email: "add-test@example.com", contractIds: [CONTRACT_A_ID], tokenExpiryHours: 72 },
      repos,
    );

    expect(invited.authorizedContracts).toHaveLength(1);

    const added = await authorizeContract(
      context,
      {
        viewerAccessId: invited.viewerAccess.id,
        contractId: CONTRACT_B_ID,
      },
      repos.viewerAccess,
      repos.contracts,
    );

    expect(added.contractId).toBe(CONTRACT_B_ID);

    const allContracts = await repos.viewerAccess.listAuthorizedContracts(
      WORKSPACE_ID,
      invited.viewerAccess.id,
    );

    expect(allContracts).toHaveLength(2);
    expect(allContracts.map((c) => c.contractId).sort()).toEqual(
      [CONTRACT_A_ID, CONTRACT_B_ID].sort(),
    );
  });

  it("allows revoking contracts from PENDING viewer", async () => {
    const repos = createRepositories();

    const invited = await inviteViewer(
      context,
      {
        email: "revoke-test@example.com",
        contractIds: [CONTRACT_A_ID, CONTRACT_B_ID],
        tokenExpiryHours: 72,
      },
      repos,
    );

    expect(invited.authorizedContracts).toHaveLength(2);

    await revokeContractAccess(
      context,
      invited.viewerAccess.id,
      CONTRACT_A_ID,
      repos.viewerAccess,
    );

    const remaining = await repos.viewerAccess.listAuthorizedContracts(
      WORKSPACE_ID,
      invited.viewerAccess.id,
    );

    expect(remaining).toHaveLength(1);
    expect(remaining[0].contractId).toBe(CONTRACT_B_ID);
  });

  it("activation uses current contract associations", async () => {
    const repos = createRepositories();

    const invited = await inviteViewer(
      context,
      { email: "activate-test@example.com", contractIds: [CONTRACT_A_ID], tokenExpiryHours: 72 },
      repos,
    );

    await authorizeContract(
      context,
      {
        viewerAccessId: invited.viewerAccess.id,
        contractId: CONTRACT_B_ID,
      },
      repos.viewerAccess,
      repos.contracts,
    );

    const activated = await activateViewer(
      { plainToken: invited.plainToken, userId: "viewer-123" },
      { runInTransaction },
    );

    expect(activated.viewerAccess.status).toBe("ACTIVE");

    const contracts = await repos.viewerAccess.listAuthorizedContracts(
      WORKSPACE_ID,
      activated.viewerAccess.id,
    );

    expect(contracts).toHaveLength(2);
    expect(contracts.map((c) => c.contractId).sort()).toEqual(
      [CONTRACT_A_ID, CONTRACT_B_ID].sort(),
    );
  });

  it("contracts persist after activation", async () => {
    const repos = createRepositories();

    const invited = await inviteViewer(
      context,
      { email: "persist-test@example.com", contractIds: [CONTRACT_A_ID], tokenExpiryHours: 72 },
      repos,
    );

    const activated = await activateViewer(
      { plainToken: invited.plainToken, userId: "viewer-persist" },
      { runInTransaction },
    );

    const contractsBefore = await repos.viewerAccess.listAuthorizedContracts(
      WORKSPACE_ID,
      activated.viewerAccess.id,
    );

    expect(contractsBefore).toHaveLength(1);

    await authorizeContract(
      context,
      {
        viewerAccessId: activated.viewerAccess.id,
        contractId: CONTRACT_B_ID,
      },
      repos.viewerAccess,
      repos.contracts,
    );

    const contractsAfter = await repos.viewerAccess.listAuthorizedContracts(
      WORKSPACE_ID,
      activated.viewerAccess.id,
    );

    expect(contractsAfter).toHaveLength(2);
  });

  it("prevents duplicate contract associations", async () => {
    const repos = createRepositories();

    const invited = await inviteViewer(
      context,
      { email: "dup-test@example.com", contractIds: [CONTRACT_A_ID], tokenExpiryHours: 72 },
      repos,
    );

    await expect(
      authorizeContract(
        context,
        {
          viewerAccessId: invited.viewerAccess.id,
          contractId: CONTRACT_A_ID,
        },
        repos.viewerAccess,
        repos.contracts,
      ),
    ).rejects.toThrow();
  });

  it("rejects adding contracts from foreign workspace", async () => {
    const repos = createRepositories();

    const foreignWorkspaceId = "99999999-9999-4999-8999-999999999999";
    await prisma.workspace.create({
      data: {
        id: foreignWorkspaceId,
        name: "Foreign Workspace",
        timezone: "UTC",
        currency: "USD",
      },
    });

    const invited = await inviteViewer(
      context,
      { email: "foreign-test@example.com", contractIds: [CONTRACT_A_ID], tokenExpiryHours: 72 },
      repos,
    );

    const foreignContext: WorkspaceContext = {
      workspaceId: foreignWorkspaceId,
      userId: "foreign-user",
      role: "OWNER",
      timezone: "UTC",
    };

    await expect(
      authorizeContract(
        foreignContext,
        {
          viewerAccessId: invited.viewerAccess.id,
          contractId: CONTRACT_B_ID,
        },
        repos.viewerAccess,
        repos.contracts,
      ),
    ).rejects.toThrow(ViewerAccessNotFoundError);
  });

  it("rejects adding non-existent contracts", async () => {
    const repos = createRepositories();

    const invited = await inviteViewer(
      context,
      { email: "notfound-test@example.com", contractIds: [CONTRACT_A_ID], tokenExpiryHours: 72 },
      repos,
    );

    await expect(
      authorizeContract(
        context,
        {
          viewerAccessId: invited.viewerAccess.id,
          contractId: "00000000-0000-4000-8000-000000000099",
        },
        repos.viewerAccess,
        repos.contracts,
      ),
    ).rejects.toThrow(ContractNotFoundError);
  });

  it("rejects modifying contracts for REVOKED viewer", async () => {
    const repos = createRepositories();

    const invited = await inviteViewer(
      context,
      { email: "revoked-test@example.com", contractIds: [CONTRACT_A_ID], tokenExpiryHours: 72 },
      repos,
    );

    const activated = await activateViewer(
      { plainToken: invited.plainToken, userId: "viewer-revoked" },
      { runInTransaction },
    );

    await repos.viewerAccess.revoke(WORKSPACE_ID, activated.viewerAccess.id);

    await expect(
      authorizeContract(
        context,
        {
          viewerAccessId: activated.viewerAccess.id,
          contractId: CONTRACT_B_ID,
        },
        repos.viewerAccess,
        repos.contracts,
      ),
    ).rejects.toThrow(ViewerAccessNotFoundError);
  });
});
