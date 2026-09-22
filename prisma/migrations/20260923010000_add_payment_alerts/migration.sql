-- P-E03-03: persist PAYMENT_* alert types and invoice-scoped identity.
-- Existing CONTRACT_* / CAPACITY_* rows keep invoiceId NULL. No backfill.

ALTER TYPE "AlertType" ADD VALUE 'PAYMENT_PARTIAL';
ALTER TYPE "AlertType" ADD VALUE 'PAYMENT_OVERDUE';
ALTER TYPE "AlertType" ADD VALUE 'PAYMENT_MISMATCH';

ALTER TABLE "Alert" ADD COLUMN "invoiceId" UUID;

CREATE INDEX "Alert_workspaceId_invoiceId_type_idx" ON "Alert"("workspaceId", "invoiceId", "type");

ALTER TABLE "Alert" ADD CONSTRAINT "Alert_invoiceId_fkey"
FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Composite workspace isolation: a payment alert cannot reference an Invoice
-- from another workspace. MATCH SIMPLE: NULL invoiceId skips the check.
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_workspaceId_invoiceId_fkey"
FOREIGN KEY ("workspaceId", "invoiceId") REFERENCES "Invoice"("workspaceId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Compare as text so this can run in the same transaction as ADD VALUE
-- (PostgreSQL cannot use a newly added enum label until commit).
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_payment_invoice_required"
CHECK (
  "type"::text NOT IN ('PAYMENT_PARTIAL', 'PAYMENT_OVERDUE', 'PAYMENT_MISMATCH')
  OR "invoiceId" IS NOT NULL
);
