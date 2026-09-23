-- P-E04-03: persist ALLOCATION_* alert types. Contract-level, period-less.
-- Existing CONTRACT_* / PAYMENT_* / CAPACITY_* rows are unchanged.

ALTER TYPE "AlertType" ADD VALUE 'ALLOCATION_WARNING';
ALTER TYPE "AlertType" ADD VALUE 'ALLOCATION_EXCEEDED';

CREATE INDEX "Alert_workspaceId_contractId_type_idx" ON "Alert"("workspaceId", "contractId", "type");

-- Compare as text so this can run in the same transaction as ADD VALUE
-- (PostgreSQL cannot use a newly added enum label until commit).
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_allocation_contract_required"
CHECK (
  "type"::text NOT IN ('ALLOCATION_WARNING', 'ALLOCATION_EXCEEDED')
  OR (
    "contractId" IS NOT NULL
    AND "invoiceId" IS NULL
    AND "periodStart" IS NULL
    AND "periodEnd" IS NULL
  )
);
