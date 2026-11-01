// src/infrastructure/persistence/anomaly-report-repository.ts
import type {
  AnomalyReportStatus,
  CreateAnomalyReportInput,
  UpdateAnomalyReportInput,
} from "@/domain/persistence-types";
import type { AnomalyReportRepository } from "@/domain/repositories";
import { withPersistenceErrors } from "@/infrastructure/persistence/map-prisma-error";
import { mapAnomalyReport } from "@/infrastructure/persistence/mappers";
import type { PrismaExecutor } from "@/infrastructure/persistence/prisma-executor";

export function createAnomalyReportRepository(
  db: PrismaExecutor,
): AnomalyReportRepository {
  return {
    create(workspaceId: string, input: CreateAnomalyReportInput) {
      return withPersistenceErrors(async () =>
        mapAnomalyReport(
          await db.anomalyReport.create({
            data: {
              workspaceId,
              viewerAccessId: input.viewerAccessId,
              timeEntryId: input.timeEntryId ?? null,
              workDate: input.workDate,
              message: input.message,
              status: input.status,
            },
          }),
        ),
      );
    },

    async getById(workspaceId: string, reportId: string) {
      return withPersistenceErrors(async () => {
        const row = await db.anomalyReport.findFirst({
          where: { id: reportId, workspaceId },
        });
        return row ? mapAnomalyReport(row) : null;
      });
    },

    async listForWorkspace(
      workspaceId: string,
      status?: AnomalyReportStatus,
    ) {
      return withPersistenceErrors(async () => {
        const rows = await db.anomalyReport.findMany({
          where: {
            workspaceId,
            ...(status ? { status } : {}),
          },
          orderBy: { createdAt: "desc" },
        });
        return rows.map(mapAnomalyReport);
      });
    },

    async listForViewerAccess(
      workspaceId: string,
      viewerAccessId: string,
      status?: AnomalyReportStatus,
    ) {
      return withPersistenceErrors(async () => {
        const rows = await db.anomalyReport.findMany({
          where: {
            workspaceId,
            viewerAccessId,
            ...(status ? { status } : {}),
          },
          orderBy: { createdAt: "desc" },
        });
        return rows.map(mapAnomalyReport);
      });
    },

    async countReportsForViewerSince(
      workspaceId: string,
      viewerAccessId: string,
      since: Date,
    ) {
      return withPersistenceErrors(async () =>
        db.anomalyReport.count({
          where: {
            workspaceId,
            viewerAccessId,
            createdAt: { gte: since },
          },
        }),
      );
    },

    async update(
      workspaceId: string,
      reportId: string,
      input: UpdateAnomalyReportInput,
    ) {
      return withPersistenceErrors(async () =>
        mapAnomalyReport(
          await db.anomalyReport.update({
            where: { id: reportId },
            data: {
              ...(input.status ? { status: input.status } : {}),
              ...(input.freelanceNotes !== undefined
                ? { freelanceNotes: input.freelanceNotes }
                : {}),
              ...(input.acknowledgedAt
                ? { acknowledgedAt: input.acknowledgedAt }
                : {}),
              ...(input.resolvedAt ? { resolvedAt: input.resolvedAt } : {}),
            },
          }),
        ),
      );
    },
  };
}
