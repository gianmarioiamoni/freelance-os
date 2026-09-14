// src/infrastructure/persistence/time-entry-repository.ts
import type { RecordTimeEntryInput, UpdateTimeEntryInput } from "@/domain/persistence-types";
import type { TimeEntryRepository } from "@/domain/repositories";
import { withPersistenceErrors } from "@/infrastructure/persistence/map-prisma-error";
import { mapTimeEntry } from "@/infrastructure/persistence/mappers";
import type { PrismaExecutor } from "@/infrastructure/persistence/prisma-executor";

export function createTimeEntryRepository(db: PrismaExecutor): TimeEntryRepository {
  return {
    recordTimeEntry(workspaceId: string, input: RecordTimeEntryInput) {
      return withPersistenceErrors(async () =>
        mapTimeEntry(
          await db.timeEntry.create({
            data: {
              workspaceId,
              userId: input.userId,
              clientId: input.clientId,
              contractId: input.contractId,
              workDate: input.workDate,
              durationMinutes: input.durationMinutes,
              description: input.description ?? null,
              billable: input.billable,
            },
          }),
        ),
      );
    },

    async getTimeEntry(workspaceId: string, timeEntryId: string) {
      return withPersistenceErrors(async () => {
        const row = await db.timeEntry.findFirst({
          where: { id: timeEntryId, workspaceId },
        });
        return row ? mapTimeEntry(row) : null;
      });
    },

    listTimeEntriesForDate(workspaceId: string, workDate: Date) {
      return withPersistenceErrors(async () => {
        const rows = await db.timeEntry.findMany({
          where: { workspaceId, workDate },
          orderBy: { createdAt: "asc" },
        });
        return rows.map(mapTimeEntry);
      });
    },

    listTimeEntriesForPeriod(workspaceId: string, startDate: Date, endDate: Date) {
      return withPersistenceErrors(async () => {
        const rows = await db.timeEntry.findMany({
          where: {
            workspaceId,
            workDate: {
              gte: startDate,
              lte: endDate,
            },
          },
          orderBy: [{ workDate: "asc" }, { createdAt: "asc" }],
        });
        return rows.map(mapTimeEntry);
      });
    },

    async updateTimeEntry(workspaceId: string, timeEntryId: string, input: UpdateTimeEntryInput) {
      return withPersistenceErrors(async () =>
        mapTimeEntry(
          await db.timeEntry.update({
            where: { id: timeEntryId, workspaceId },
            data: {
              ...(input.durationMinutes !== undefined && { durationMinutes: input.durationMinutes }),
              ...(input.description !== undefined && { description: input.description }),
              ...(input.billable !== undefined && { billable: input.billable }),
            },
          }),
        ),
      );
    },

    async deleteTimeEntry(workspaceId: string, timeEntryId: string) {
      return withPersistenceErrors(async () => {
        await db.timeEntry.delete({
          where: { id: timeEntryId, workspaceId },
        });
      });
    },
  };
}
