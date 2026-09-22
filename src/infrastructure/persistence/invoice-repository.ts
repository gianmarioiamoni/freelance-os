// src/infrastructure/persistence/invoice-repository.ts
import { InvoiceNotEditableError } from "@/domain/invoice-errors";
import { RecordNotFoundError } from "@/domain/persistence-errors";
import type {
  CreateInvoiceInput,
  InvoiceTrackingFilter,
  UpdateInvoiceInput,
} from "@/domain/persistence-types";
import type { InvoiceRepository } from "@/domain/repositories";
import { withPersistenceErrors } from "@/infrastructure/persistence/map-prisma-error";
import { mapInvoice } from "@/infrastructure/persistence/mappers";
import type { PrismaExecutor } from "@/infrastructure/persistence/prisma-executor";

function trackingWhere(tracking: InvoiceTrackingFilter | undefined) {
  if (tracking === "ALL") {
    return {};
  }

  if (tracking === "VOID") {
    return { voidedAt: { not: null } };
  }

  return { voidedAt: null };
}

export function createInvoiceRepository(db: PrismaExecutor): InvoiceRepository {
  return {
    createInvoice(workspaceId: string, input: CreateInvoiceInput) {
      return withPersistenceErrors(async () =>
        mapInvoice(
          await db.invoice.create({
            data: {
              workspaceId,
              contractId: input.contractId,
              invoiceDate: input.invoiceDate,
              amount: input.amount,
              currency: input.currency,
              reference: input.reference ?? null,
              paymentTermsDays: input.paymentTermsDays ?? null,
              dueDate: input.dueDate ?? null,
            },
          }),
        ),
      );
    },

    async getInvoice(workspaceId: string, invoiceId: string) {
      return withPersistenceErrors(async () => {
        const row = await db.invoice.findFirst({
          where: { id: invoiceId, workspaceId },
        });
        return row ? mapInvoice(row) : null;
      });
    },

    listInvoicesForContract(
      workspaceId: string,
      contractId: string,
      tracking?: InvoiceTrackingFilter,
    ) {
      return withPersistenceErrors(async () => {
        const rows = await db.invoice.findMany({
          where: {
            workspaceId,
            contractId,
            ...trackingWhere(tracking),
          },
          orderBy: [{ invoiceDate: "asc" }, { createdAt: "asc" }],
        });
        return rows.map(mapInvoice);
      });
    },

    async updateInvoice(
      workspaceId: string,
      invoiceId: string,
      input: UpdateInvoiceInput,
    ) {
      const outcome = await withPersistenceErrors(async () => {
        const result = await db.invoice.updateMany({
          where: { id: invoiceId, workspaceId, voidedAt: null },
          data: {
            ...(input.invoiceDate !== undefined && { invoiceDate: input.invoiceDate }),
            ...(input.amount !== undefined && { amount: input.amount }),
            ...(input.reference !== undefined && { reference: input.reference }),
            ...(input.dueDate !== undefined && { dueDate: input.dueDate }),
          },
        });

        const row = await db.invoice.findFirst({
          where: { id: invoiceId, workspaceId },
        });

        return { count: result.count, row };
      });

      if (!outcome.row) {
        throw new RecordNotFoundError("Invoice", invoiceId);
      }

      if (outcome.count === 0) {
        throw new InvoiceNotEditableError();
      }

      return mapInvoice(outcome.row);
    },

    voidInvoice(workspaceId: string, invoiceId: string) {
      return withPersistenceErrors(async () => {
        const result = await db.invoice.updateMany({
          where: { id: invoiceId, workspaceId, voidedAt: null },
          data: { voidedAt: new Date() },
        });

        const row = await db.invoice.findFirst({
          where: { id: invoiceId, workspaceId },
        });

        if (!row) {
          throw new RecordNotFoundError("Invoice", invoiceId);
        }

        if (result.count === 0 && row.voidedAt === null) {
          throw new RecordNotFoundError("Invoice", invoiceId);
        }

        return mapInvoice(row);
      });
    },

    existsForContract(workspaceId: string, contractId: string) {
      return withPersistenceErrors(async () => {
        const count = await db.invoice.count({
          where: { workspaceId, contractId },
        });
        return count > 0;
      });
    },
  };
}
