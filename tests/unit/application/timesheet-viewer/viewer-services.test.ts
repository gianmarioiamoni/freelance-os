// tests/unit/application/timesheet-viewer/viewer-services.test.ts
import { describe, expect, it } from "vitest";

import { acknowledgeAnomaly } from "@/application/timesheet-viewer/acknowledge-anomaly";
import { activateViewer } from "@/application/timesheet-viewer/activate-viewer";
import { authorizeContract } from "@/application/timesheet-viewer/authorize-contract";
import { createAnomalyReport } from "@/application/timesheet-viewer/create-anomaly-report";
import { inviteViewer } from "@/application/timesheet-viewer/invite-viewer";
import { listViewerAccess } from "@/application/timesheet-viewer/list-viewer-access";
import { resolveAnomaly } from "@/application/timesheet-viewer/resolve-anomaly";
import { revokeContractAccess } from "@/application/timesheet-viewer/revoke-contract-access";
import { revokeViewer } from "@/application/timesheet-viewer/revoke-viewer";
import type { WorkspaceContext } from "@/application/workspace/workspace-context";
import { ContractNotFoundError } from "@/domain/contract-errors";
import { RecordNotFoundError } from "@/domain/persistence-errors";
import type {
  AnomalyReportRecord,
  AnomalyReportStatus,
  ContractRecord,
  CreateAnomalyReportInput,
  TimesheetViewerAccessRecord,
  TimesheetViewerContractRecord,
  ViewerAccessStatus,
  ViewerInviteTokenRecord,
} from "@/domain/persistence-types";
import type {
  AnomalyReportRepository,
  ContractRepository,
  PersistenceRepositories,
  ViewerAccessRepository,
  ViewerInviteTokenRepository,
} from "@/domain/repositories";
import {
  AnomalyReportNotFoundError,
  InvalidViewerStatusTransitionError,
  ViewerAccessNotFoundError,
  ViewerTokenAlreadyAcceptedError,
  ViewerTokenExpiredError,
  ViewerTokenNotFoundError,
} from "@/domain/viewer-errors";

const context: WorkspaceContext = {
  workspaceId: "workspace-1",
  userId: "user-1",
  role: "OWNER",
  timezone: "UTC",
};

function viewerAccessRecord(
  overrides: Partial<TimesheetViewerAccessRecord> = {},
): TimesheetViewerAccessRecord {
  return {
    id: "550e8400-e29b-41d4-a716-446655440001",
    workspaceId: context.workspaceId,
    userId: null,
    email: "viewer@example.com",
    status: "PENDING",
    invitedAt: new Date("2026-10-29T00:00:00.000Z"),
    activatedAt: null,
    revokedAt: null,
    createdAt: new Date("2026-10-29T00:00:00.000Z"),
    updatedAt: new Date("2026-10-29T00:00:00.000Z"),
    ...overrides,
  };
}

function tokenRecord(
  overrides: Partial<ViewerInviteTokenRecord> = {},
): ViewerInviteTokenRecord {
  return {
    id: "550e8400-e29b-41d4-a716-446655440002",
    workspaceId: context.workspaceId,
    viewerAccessId: "550e8400-e29b-41d4-a716-446655440001",
    tokenHash: "hash123",
    expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000),
    acceptedAt: null,
    createdAt: new Date("2026-10-29T00:00:00.000Z"),
    ...overrides,
  };
}

function contractRecord(
  overrides: Partial<ContractRecord> = {},
): ContractRecord {
  return {
    id: "550e8400-e29b-41d4-a716-446655440003",
    workspaceId: context.workspaceId,
    clientId: "550e8400-e29b-41d4-a716-446655440004",
    reference: null,
    validFrom: new Date("2026-01-01"),
    validTo: null,
    billingModel: "HOURLY",
    rate: "50.00",
    currency: "EUR",
    commitmentMode: "PERCENTAGE",
    commitmentPercentage: 0,
    allocatedMinutes: null,
    paymentTermsDays: null,
    paymentTermsNote: null,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    ...overrides,
  };
}

function anomalyRecord(
  overrides: Partial<AnomalyReportRecord> = {},
): AnomalyReportRecord {
  return {
    id: "550e8400-e29b-41d4-a716-446655440005",
    workspaceId: context.workspaceId,
    viewerAccessId: "550e8400-e29b-41d4-a716-446655440001",
    timeEntryId: null,
    workDate: new Date("2026-10-29"),
    message: "This entry seems incorrect",
    status: "OPEN",
    freelanceNotes: null,
    createdAt: new Date("2026-10-29T00:00:00.000Z"),
    acknowledgedAt: null,
    resolvedAt: null,
    ...overrides,
  };
}

function createFakeViewerAccessRepository(
  seed: TimesheetViewerAccessRecord[] = [],
  contractSeed: TimesheetViewerContractRecord[] = [],
): ViewerAccessRepository {
  const records = [...seed];
  const contracts = [...contractSeed];

  return {
    async create(workspaceId, input) {
      const record = viewerAccessRecord({
        id: `viewer-${records.length + 1}`,
        workspaceId,
        userId: input.userId,
        email: input.email,
        status: input.status,
      });
      records.push(record);
      return record;
    },
    async getById(workspaceId, viewerAccessId) {
      return (
        records.find(
          (r) => r.id === viewerAccessId && r.workspaceId === workspaceId,
        ) ?? null
      );
    },
    async findByWorkspaceAndEmail(workspaceId, email) {
      return (
        records.find(
          (r) => r.email === email && r.workspaceId === workspaceId,
        ) ?? null
      );
    },
    async getActiveAccess(workspaceId, userId) {
      return (
        records.find(
          (r) =>
            r.userId === userId &&
            r.workspaceId === workspaceId &&
            r.status === "ACTIVE",
        ) ?? null
      );
    },
    async listActiveByUserId(userId) {
      return records.filter((r) => r.userId === userId && r.status === "ACTIVE");
    },
    async listForWorkspace(workspaceId, status) {
      return records.filter(
        (r) => r.workspaceId === workspaceId && (!status || r.status === status)
      );
    },
    async activate(workspaceId, viewerAccessId, userId, activatedAt) {
      const record = records.find(
        (r) => r.id === viewerAccessId && r.workspaceId === workspaceId,
      );
      if (!record) throw new RecordNotFoundError("ViewerAccess", viewerAccessId);
      record.userId = userId;
      record.status = "ACTIVE";
      record.activatedAt = activatedAt;
      return record;
    },
    async revoke(workspaceId, viewerAccessId) {
      const record = records.find(
        (r) => r.id === viewerAccessId && r.workspaceId === workspaceId,
      );
      if (!record) throw new RecordNotFoundError("ViewerAccess", viewerAccessId);
      record.status = "REVOKED";
      record.revokedAt = new Date();
      return record;
    },
    async authorizeContract(workspaceId, input) {
      const contractRecord: TimesheetViewerContractRecord = {
        viewerAccessId: input.viewerAccessId,
        workspaceId,
        contractId: input.contractId,
        displayLabel: input.displayLabel ?? null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      contracts.push(contractRecord);
      return contractRecord;
    },
    async listAuthorizedContracts(workspaceId, viewerAccessId) {
      return contracts.filter(
        (c) => c.workspaceId === workspaceId && c.viewerAccessId === viewerAccessId,
      );
    },
    async revokeContractAuthorization(workspaceId, viewerAccessId, contractId) {
      const index = contracts.findIndex(
        (c) =>
          c.workspaceId === workspaceId &&
          c.viewerAccessId === viewerAccessId &&
          c.contractId === contractId,
      );
      if (index !== -1) {
        contracts.splice(index, 1);
      }
    },
  };
}

function createFakeViewerTokenRepository(
  seed: ViewerInviteTokenRecord[] = [],
): ViewerInviteTokenRepository {
  const records = [...seed];

  return {
    async create(workspaceId, input) {
      const record = tokenRecord({
        id: `token-${records.length + 1}`,
        workspaceId,
        viewerAccessId: input.viewerAccessId,
        tokenHash: input.tokenHash,
        expiresAt: input.expiresAt,
      });
      records.push(record);
      return record;
    },
    async findByTokenHashForUpdate(tokenHash) {
      return records.find((r) => r.tokenHash === tokenHash) ?? null;
    },
    async markAccepted(workspaceId, tokenId, acceptedAt) {
      const record = records.find(
        (r) => r.id === tokenId && r.workspaceId === workspaceId,
      );
      if (!record) throw new RecordNotFoundError("ViewerInviteToken", tokenId);
      record.acceptedAt = acceptedAt;
      return record;
    },
    async invalidateAllForViewerAccess(workspaceId, viewerAccessId) {
      // Mark all tokens as expired (set expiresAt to past)
      records
        .filter(
          (r) => r.workspaceId === workspaceId && r.viewerAccessId === viewerAccessId,
        )
        .forEach((r) => {
          r.expiresAt = new Date(0);
        });
    },
  };
}

function createFakeContractRepository(
  seed: ContractRecord[] = [],
): ContractRepository {
  const records = [...seed];

  return {
    async getContract(workspaceId, contractId) {
      return (
        records.find(
          (r) => r.id === contractId && r.workspaceId === workspaceId,
        ) ?? null
      );
    },
    async lockContract(workspaceId, contractId) {
      return (
        records.find(
          (r) => r.id === contractId && r.workspaceId === workspaceId,
        ) ?? null
      );
    },
    async listContracts(workspaceId) {
      return records.filter((r) => r.workspaceId === workspaceId);
    },
    async listContractsForClient(workspaceId, clientId) {
      return records.filter(
        (r) => r.workspaceId === workspaceId && r.clientId === clientId,
      );
    },
    async findContractCoveringDate(workspaceId, clientId, date) {
      return (
        records.find(
          (r) =>
            r.workspaceId === workspaceId &&
            r.clientId === clientId &&
            r.validFrom <= date &&
            (r.validTo === null || r.validTo >= date),
        ) ?? null
      );
    },
    async createContract() {
      throw new Error("Not implemented");
    },
    async updateContract() {
      throw new Error("Not implemented");
    },
  };
}

function createFakeAnomalyReportRepository(
  seed: AnomalyReportRecord[] = [],
): AnomalyReportRepository {
  const records = [...seed];

  return {
    async create(workspaceId, input) {
      const record = anomalyRecord({
        id: `anomaly-${records.length + 1}`,
        workspaceId,
        viewerAccessId: input.viewerAccessId,
        timeEntryId: input.timeEntryId ?? null,
        workDate: input.workDate,
        message: input.message,
        status: input.status,
      });
      records.push(record);
      return record;
    },
    async getById(workspaceId, reportId) {
      return (
        records.find(
          (r) => r.id === reportId && r.workspaceId === workspaceId,
        ) ?? null
      );
    },
    async listForWorkspace(workspaceId, status) {
      return records.filter(
        (r) =>
          r.workspaceId === workspaceId &&
          (status === undefined || r.status === status),
      );
    },
    async listForViewerAccess(workspaceId, viewerAccessId, status) {
      return records.filter(
        (r) =>
          r.workspaceId === workspaceId &&
          r.viewerAccessId === viewerAccessId &&
          (status === undefined || r.status === status),
      );
    },
    async countReportsForViewerSince(workspaceId, viewerAccessId, since) {
      return records.filter(
        (r) =>
          r.workspaceId === workspaceId &&
          r.viewerAccessId === viewerAccessId &&
          r.createdAt >= since,
      ).length;
    },
    async update(workspaceId, reportId, input) {
      const record = records.find(
        (r) => r.id === reportId && r.workspaceId === workspaceId,
      );
      if (!record) throw new RecordNotFoundError("AnomalyReport", reportId);

      if (input.status !== undefined) record.status = input.status;
      if (input.freelanceNotes !== undefined)
        record.freelanceNotes = input.freelanceNotes;
      if (input.acknowledgedAt !== undefined)
        record.acknowledgedAt = input.acknowledgedAt;
      if (input.resolvedAt !== undefined) record.resolvedAt = input.resolvedAt;

      return record;
    },
  };
}

describe("inviteViewer", () => {
  it("creates viewer access and token with PENDING status", async () => {
    const viewerAccess = createFakeViewerAccessRepository();
    const viewerTokens = createFakeViewerTokenRepository();
    const repositories = {
      viewerAccess,
      viewerTokens,
    } as unknown as PersistenceRepositories;

    const result = await inviteViewer(
      context,
      { email: "test@example.com", tokenExpiryHours: 48 },
      repositories,
    );

    expect(result.viewerAccess.email).toBe("test@example.com");
    expect(result.viewerAccess.status).toBe("PENDING");
    expect(result.viewerAccess.userId).toBeNull();
    expect(result.token.tokenHash).toBeTruthy();
    expect(result.plainToken).toBeTruthy();
    expect(result.plainToken).not.toBe(result.token.tokenHash);
  });
});

describe("activateViewer", () => {
  it("activates viewer and marks token as accepted", async () => {
    const plainToken = "testtoken123456789012345678901234567890abcdef";
    // SHA-256 hash of plainToken
    const tokenHash = "57e9f72b3b3055fb86be68d9f974ca74101f3652427dd6bd68d685f5e45ea643";
    
    const viewer = viewerAccessRecord({ status: "PENDING" });
    const token = tokenRecord({
      tokenHash,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60),
    });

    const viewerAccess = createFakeViewerAccessRepository([viewer]);
    const viewerTokens = createFakeViewerTokenRepository([token]);

    const runInTransaction = async <T,>(
      work: (repos: PersistenceRepositories) => Promise<T>,
    ) => {
      const repositories = {
        viewerAccess,
        viewerTokens,
      } as unknown as PersistenceRepositories;
      return work(repositories);
    };

    const result = await activateViewer(
      { plainToken, userId: "user-2" },
      { runInTransaction },
    );

    expect(result.viewerAccess.status).toBe("ACTIVE");
    expect(result.viewerAccess.userId).toBe("user-2");
    expect(result.viewerAccess.activatedAt).toBeTruthy();
    expect(result.token.acceptedAt).toBeTruthy();
  });

  it("rejects expired token", async () => {
    const plainToken = "expiredtoken123456789012345678901234567890";
    const tokenHash = "579253e494ce5628101d797dc70b0bad492bcfcd89ec1a3928a2772913ad874c";
    
    const viewer = viewerAccessRecord({ status: "PENDING" });
    const token = tokenRecord({
      tokenHash,
      expiresAt: new Date(Date.now() - 1000),
    });

    const viewerAccess = createFakeViewerAccessRepository([viewer]);
    const viewerTokens = createFakeViewerTokenRepository([token]);

    const runInTransaction = async <T,>(
      work: (repos: PersistenceRepositories) => Promise<T>,
    ) => {
      const repositories = {
        viewerAccess,
        viewerTokens,
      } as unknown as PersistenceRepositories;
      return work(repositories);
    };

    await expect(
      activateViewer({ plainToken, userId: "user-2" }, { runInTransaction }),
    ).rejects.toThrow(ViewerTokenExpiredError);
  });

  it("rejects already accepted token", async () => {
    const plainToken = "acceptedtoken12345678901234567890123456789";
    const tokenHash = "a482ca7a862eb1290cbd2998edb860c8415ddedef881314c895658b3d3d04564";
    
    const viewer = viewerAccessRecord({ status: "ACTIVE", userId: "user-2" });
    const token = tokenRecord({
      tokenHash,
      acceptedAt: new Date(),
    });

    const viewerAccess = createFakeViewerAccessRepository([viewer]);
    const viewerTokens = createFakeViewerTokenRepository([token]);

    const runInTransaction = async <T,>(
      work: (repos: PersistenceRepositories) => Promise<T>,
    ) => {
      const repositories = {
        viewerAccess,
        viewerTokens,
      } as unknown as PersistenceRepositories;
      return work(repositories);
    };

    await expect(
      activateViewer({ plainToken, userId: "user-2" }, { runInTransaction }),
    ).rejects.toThrow(ViewerTokenAlreadyAcceptedError);
  });
});

describe("revokeViewer", () => {
  it("revokes active viewer access", async () => {
    const viewer = viewerAccessRecord({ status: "ACTIVE", userId: "user-2" });
    const viewerAccess = createFakeViewerAccessRepository([viewer]);
    const viewerTokens = createFakeViewerTokenRepository();
    const repositories = {
      viewerAccess,
      viewerTokens,
    } as unknown as PersistenceRepositories;

    const result = await revokeViewer(context, viewer.id, repositories);

    expect(result.status).toBe("REVOKED");
    expect(result.revokedAt).toBeTruthy();
  });

  it("rejects revoking already revoked viewer", async () => {
    const viewer = viewerAccessRecord({ status: "REVOKED" });
    const viewerAccess = createFakeViewerAccessRepository([viewer]);
    const viewerTokens = createFakeViewerTokenRepository();
    const repositories = {
      viewerAccess,
      viewerTokens,
    } as unknown as PersistenceRepositories;

    await expect(
      revokeViewer(context, viewer.id, repositories),
    ).rejects.toThrow(InvalidViewerStatusTransitionError);
  });
});

describe("authorizeContract", () => {
  it("authorizes contract for viewer", async () => {
    const viewer = viewerAccessRecord({ status: "ACTIVE", userId: "user-2" });
    const contract = contractRecord();
    const viewerAccess = createFakeViewerAccessRepository([viewer]);
    const contracts = createFakeContractRepository([contract]);

    const result = await authorizeContract(
      context,
      {
        viewerAccessId: viewer.id,
        contractId: contract.id,
        displayLabel: "Test Project",
      },
      viewerAccess,
      contracts,
    );

    expect(result.viewerAccessId).toBe(viewer.id);
    expect(result.contractId).toBe(contract.id);
    expect(result.displayLabel).toBe("Test Project");
  });

  it("rejects non-existent viewer", async () => {
    const contract = contractRecord();
    const viewerAccess = createFakeViewerAccessRepository();
    const contracts = createFakeContractRepository([contract]);

    await expect(
      authorizeContract(
        context,
        {
          viewerAccessId: "550e8400-e29b-41d4-a716-446655449999",
          contractId: contract.id,
        },
        viewerAccess,
        contracts,
      ),
    ).rejects.toThrow(ViewerAccessNotFoundError);
  });

  it("rejects non-existent contract", async () => {
    const viewer = viewerAccessRecord({ status: "ACTIVE", userId: "user-2" });
    const viewerAccess = createFakeViewerAccessRepository([viewer]);
    const contracts = createFakeContractRepository();

    await expect(
      authorizeContract(
        context,
        {
          viewerAccessId: viewer.id,
          contractId: "550e8400-e29b-41d4-a716-446655449998",
        },
        viewerAccess,
        contracts,
      ),
    ).rejects.toThrow(ContractNotFoundError);
  });
});

describe("createAnomalyReport", () => {
  it("creates anomaly report for active viewer", async () => {
    const viewer = viewerAccessRecord({ status: "ACTIVE", userId: "user-2" });
    const viewerAccess = createFakeViewerAccessRepository([viewer]);
    const anomalyReports = createFakeAnomalyReportRepository();

    const result = await createAnomalyReport(
      context,
      {
        viewerAccessId: viewer.id,
        workDate: new Date("2026-10-29"),
        message: "This time entry looks incorrect to me",
      },
      viewerAccess,
      anomalyReports,
    );

    expect(result.viewerAccessId).toBe(viewer.id);
    expect(result.message).toBe("This time entry looks incorrect to me");
    expect(result.status).toBe("OPEN");
  });

  it("rejects report from non-active viewer", async () => {
    const viewer = viewerAccessRecord({ status: "PENDING" });
    const viewerAccess = createFakeViewerAccessRepository([viewer]);
    const anomalyReports = createFakeAnomalyReportRepository();

    await expect(
      createAnomalyReport(
        context,
        {
          viewerAccessId: viewer.id,
          workDate: new Date("2026-10-29"),
          message: "This time entry looks incorrect",
        },
        viewerAccess,
        anomalyReports,
      ),
    ).rejects.toThrow(ViewerAccessNotFoundError);
  });
});

describe("acknowledgeAnomaly", () => {
  it("acknowledges open anomaly report", async () => {
    const anomaly = anomalyRecord({ status: "OPEN" });
    const anomalyReports = createFakeAnomalyReportRepository([anomaly]);

    const result = await acknowledgeAnomaly(
      context,
      anomaly.id,
      { freelanceNotes: "Looking into this" },
      anomalyReports,
    );

    expect(result.status).toBe("ACKNOWLEDGED");
    expect(result.freelanceNotes).toBe("Looking into this");
    expect(result.acknowledgedAt).toBeTruthy();
  });

  it("rejects acknowledging non-open report", async () => {
    const anomaly = anomalyRecord({ status: "RESOLVED" });
    const anomalyReports = createFakeAnomalyReportRepository([anomaly]);

    await expect(
      acknowledgeAnomaly(
        context,
        anomaly.id,
        { freelanceNotes: "Too late" },
        anomalyReports,
      ),
    ).rejects.toThrow("Anomaly report must be OPEN to acknowledge");
  });
});

describe("resolveAnomaly", () => {
  it("resolves anomaly report", async () => {
    const anomaly = anomalyRecord({ status: "ACKNOWLEDGED" });
    const anomalyReports = createFakeAnomalyReportRepository([anomaly]);

    const result = await resolveAnomaly(
      context,
      anomaly.id,
      { freelanceNotes: "Fixed the entry" },
      anomalyReports,
    );

    expect(result.status).toBe("RESOLVED");
    expect(result.freelanceNotes).toBe("Fixed the entry");
    expect(result.resolvedAt).toBeTruthy();
  });

  it("rejects resolving already resolved report", async () => {
    const anomaly = anomalyRecord({ status: "RESOLVED" });
    const anomalyReports = createFakeAnomalyReportRepository([anomaly]);

    await expect(
      resolveAnomaly(
        context,
        anomaly.id,
        { freelanceNotes: "Already done" },
        anomalyReports,
      ),
    ).rejects.toThrow("Anomaly report already resolved");
  });
});

describe("revokeContractAccess", () => {
  it("revokes contract authorization for active viewer", async () => {
    const viewer = viewerAccessRecord({ status: "ACTIVE", userId: "user-2" });
    const contract = contractRecord();
    const contractAuth: TimesheetViewerContractRecord = {
      viewerAccessId: viewer.id,
      workspaceId: context.workspaceId,
      contractId: contract.id,
      displayLabel: "Test Project",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const viewerAccess = createFakeViewerAccessRepository([viewer], [contractAuth]);

    await revokeContractAccess(context, viewer.id, contract.id, viewerAccess);

    const remaining = await viewerAccess.listAuthorizedContracts(
      context.workspaceId,
      viewer.id,
    );
    expect(remaining).toHaveLength(0);
  });

  it("rejects revoking for non-active viewer", async () => {
    const viewer = viewerAccessRecord({ status: "PENDING" });
    const viewerAccess = createFakeViewerAccessRepository([viewer]);

    await expect(
      revokeContractAccess(context, viewer.id, "550e8400-e29b-41d4-a716-446655440003", viewerAccess),
    ).rejects.toThrow(ViewerAccessNotFoundError);
  });

  it("rejects revoking for non-existent viewer", async () => {
    const viewerAccess = createFakeViewerAccessRepository();

    await expect(
      revokeContractAccess(
        context,
        "550e8400-e29b-41d4-a716-446655449999",
        "550e8400-e29b-41d4-a716-446655440003",
        viewerAccess,
      ),
    ).rejects.toThrow(ViewerAccessNotFoundError);
  });
});
