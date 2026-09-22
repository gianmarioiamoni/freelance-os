// src/infrastructure/persistence/payment-repository.ts
import { RecordNotFoundError } from "@/domain/persistence-errors";
import type {
  CreatePaymentInput,
  UpdatePaymentInput,
} from "@/domain/persistence-types";
import type { PaymentRepository } from "@/domain/repositories";
import { withPersistenceErrors } from "@/infrastructure/persistence/map-prisma-error";
import { mapPayment } from "@/infrastructure/persistence/mappers";
import type { PrismaExecutor } from "@/infrastructure/persistence/prisma-executor";

export function createPaymentRepository(db: PrismaExecutor): PaymentRepository {
  return {
    createPayment(workspaceId: string, input: CreatePaymentInput) {
      return withPersistenceErrors(async () =>
        mapPayment(
          await db.payment.create({
            data: {
              workspaceId,
              invoiceId: input.invoiceId,
              paymentDate: input.paymentDate,
              amount: input.amount,
              currency: input.currency,
              notes: input.notes ?? null,
            },
          }),
        ),
      );
    },

    async getPayment(workspaceId: string, paymentId: string) {
      return withPersistenceErrors(async () => {
        const row = await db.payment.findFirst({
          where: { id: paymentId, workspaceId },
        });
        return row ? mapPayment(row) : null;
      });
    },

    listPaymentsForInvoice(workspaceId: string, invoiceId: string) {
      return withPersistenceErrors(async () => {
        const rows = await db.payment.findMany({
          where: { workspaceId, invoiceId },
          orderBy: [{ paymentDate: "asc" }, { createdAt: "asc" }],
        });
        return rows.map(mapPayment);
      });
    },

    async updatePayment(
      workspaceId: string,
      paymentId: string,
      input: UpdatePaymentInput,
    ) {
      return withPersistenceErrors(async () => {
        const result = await db.payment.updateMany({
          where: { id: paymentId, workspaceId },
          data: {
            ...(input.paymentDate !== undefined && { paymentDate: input.paymentDate }),
            ...(input.amount !== undefined && { amount: input.amount }),
            ...(input.notes !== undefined && { notes: input.notes }),
          },
        });

        if (result.count === 0) {
          throw new RecordNotFoundError("Payment", paymentId);
        }

        const row = await db.payment.findFirst({
          where: { id: paymentId, workspaceId },
        });

        if (!row) {
          throw new RecordNotFoundError("Payment", paymentId);
        }

        return mapPayment(row);
      });
    },

    async deletePayment(workspaceId: string, paymentId: string) {
      return withPersistenceErrors(async () => {
        const result = await db.payment.deleteMany({
          where: { id: paymentId, workspaceId },
        });

        if (result.count === 0) {
          throw new RecordNotFoundError("Payment", paymentId);
        }
      });
    },
  };
}
