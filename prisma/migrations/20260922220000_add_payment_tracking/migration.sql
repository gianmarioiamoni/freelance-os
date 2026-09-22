-- P-E03-01: persist Payment events against an Invoice.
-- Operational fact only. No paidAmount / status / overdue / FX.

-- CreateTable
CREATE TABLE "Payment" (
    "id" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "invoiceId" UUID NOT NULL,
    "paymentDate" DATE NOT NULL,
    "amount" DECIMAL(19,4) NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Payment_workspaceId_id_key" ON "Payment"("workspaceId", "id");

-- CreateIndex
CREATE INDEX "Payment_workspaceId_invoiceId_idx" ON "Payment"("workspaceId", "invoiceId");

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Composite workspace isolation: Payment cannot reference an Invoice from another workspace.
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_workspaceId_invoiceId_fkey" FOREIGN KEY ("workspaceId", "invoiceId") REFERENCES "Invoice"("workspaceId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Value constraints Prisma cannot express.
ALTER TABLE "Payment"
ADD CONSTRAINT "Payment_amount_positive"
CHECK ("amount" > 0);
