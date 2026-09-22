-- P-E02-01: persist Invoice Tracking records against a Contract.
-- Operational fact only. No Payment table. No persisted amount status / overdue.

-- CreateTable
CREATE TABLE "Invoice" (
    "id" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "contractId" UUID NOT NULL,
    "invoiceDate" DATE NOT NULL,
    "amount" DECIMAL(19,4) NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "reference" TEXT,
    "paymentTermsDays" INTEGER,
    "dueDate" DATE,
    "voidedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_workspaceId_id_key" ON "Invoice"("workspaceId", "id");

-- CreateIndex
CREATE INDEX "Invoice_workspaceId_contractId_invoiceDate_idx" ON "Invoice"("workspaceId", "contractId", "invoiceDate");

-- CreateIndex
CREATE INDEX "Invoice_workspaceId_voidedAt_idx" ON "Invoice"("workspaceId", "voidedAt");

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Composite workspace isolation: Invoice cannot reference a Contract from another workspace.
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_workspaceId_contractId_fkey" FOREIGN KEY ("workspaceId", "contractId") REFERENCES "Contract"("workspaceId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Value constraints Prisma cannot express.
ALTER TABLE "Invoice"
ADD CONSTRAINT "Invoice_amount_positive"
CHECK ("amount" > 0);

ALTER TABLE "Invoice"
ADD CONSTRAINT "Invoice_dueDate_terms_consistency"
CHECK (
  ("paymentTermsDays" IS NULL AND "dueDate" IS NULL)
  OR
  ("paymentTermsDays" IS NOT NULL AND "dueDate" IS NOT NULL)
);
