// src/infrastructure/persistence/create-repositories.ts
import "server-only";

import type { PersistenceRepositories } from "@/domain/repositories";
import { createAlertRepository } from "@/infrastructure/persistence/alert-repository";
import { createAnalyticsRepository } from "@/infrastructure/persistence/analytics-repository";
import { createClientRepository } from "@/infrastructure/persistence/client-repository";
import { createContractRepository } from "@/infrastructure/persistence/contract-repository";
import { createInvoiceRepository } from "@/infrastructure/persistence/invoice-repository";
import { createNotificationRepository } from "@/infrastructure/persistence/notification-repository";
import { createPaymentRepository } from "@/infrastructure/persistence/payment-repository";
import type { PrismaExecutor } from "@/infrastructure/persistence/prisma-executor";
import { createTimeEntryRepository } from "@/infrastructure/persistence/time-entry-repository";
import {
  createWorkspaceMemberRepository,
  createWorkspaceRepository,
  createWorkspaceSettingsRepository,
} from "@/infrastructure/persistence/workspace-repository";
import { prisma } from "@/infrastructure/prisma/client";

export function createRepositories(
  db: PrismaExecutor = prisma,
): PersistenceRepositories {
  return {
    workspaces: createWorkspaceRepository(db),
    members: createWorkspaceMemberRepository(db),
    settings: createWorkspaceSettingsRepository(db),
    clients: createClientRepository(db),
    contracts: createContractRepository(db),
    invoices: createInvoiceRepository(db),
    payments: createPaymentRepository(db),
    timeEntries: createTimeEntryRepository(db),
    alerts: createAlertRepository(db),
    notifications: createNotificationRepository(db),
    analytics: createAnalyticsRepository(db),
  };
}

export async function runInTransaction<T>(
  work: (repositories: PersistenceRepositories) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(async (tx) => work(createRepositories(tx)));
}
