// src/infrastructure/persistence/alert-repository.ts
import { RecordNotFoundError } from "@/domain/persistence-errors";
import type { CreateAlertInput } from "@/domain/persistence-types";
import type { AlertRepository } from "@/domain/repositories";
import { withPersistenceErrors } from "@/infrastructure/persistence/map-prisma-error";
import { mapAlert } from "@/infrastructure/persistence/mappers";
import type { PrismaExecutor } from "@/infrastructure/persistence/prisma-executor";

export function createAlertRepository(db: PrismaExecutor): AlertRepository {
  return {
    createAlert(workspaceId: string, input: CreateAlertInput) {
      return withPersistenceErrors(async () =>
        mapAlert(
          await db.alert.create({
            data: {
              workspaceId,
              type: input.type,
              severity: input.severity,
              clientId: input.clientId ?? null,
              contractId: input.contractId ?? null,
              periodStart: input.periodStart ?? null,
              periodEnd: input.periodEnd ?? null,
              deduplicationKey: input.deduplicationKey,
            },
          }),
        ),
      );
    },

    async getAlert(workspaceId: string, alertId: string) {
      return withPersistenceErrors(async () => {
        const row = await db.alert.findFirst({
          where: { id: alertId, workspaceId },
        });
        return row ? mapAlert(row) : null;
      });
    },

    async findAlertByDeduplicationKey(workspaceId: string, deduplicationKey: string) {
      return withPersistenceErrors(async () => {
        const row = await db.alert.findUnique({
          where: {
            workspaceId_deduplicationKey: { workspaceId, deduplicationKey },
          },
        });
        return row ? mapAlert(row) : null;
      });
    },

    resolveAlert(workspaceId: string, alertId: string, resolvedAt: Date) {
      return withPersistenceErrors(async () => {
        const result = await db.alert.updateMany({
          where: { id: alertId, workspaceId },
          data: { resolvedAt },
        });

        if (result.count === 0) {
          throw new RecordNotFoundError("Alert", alertId);
        }

        const row = await db.alert.findFirst({
          where: { id: alertId, workspaceId },
        });

        if (!row) {
          throw new RecordNotFoundError("Alert", alertId);
        }

        return mapAlert(row);
      });
    },
  };
}
