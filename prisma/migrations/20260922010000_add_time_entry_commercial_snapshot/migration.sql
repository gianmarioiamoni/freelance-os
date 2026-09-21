-- P-E01-01: persist the commercial value applicable when TimeEntry work was recorded.
-- Class B on the TimeEntry quantity fact. No snapshot table. No Contract revision table.

ALTER TABLE "TimeEntry"
ADD COLUMN "snapshotBillingModel" "BillingModel",
ADD COLUMN "snapshotRate" DECIMAL(19,4),
ADD COLUMN "snapshotCurrency" CHAR(3);

UPDATE "TimeEntry" AS te
SET
  "snapshotBillingModel" = c."billingModel",
  "snapshotRate" = c."rate",
  "snapshotCurrency" = c."currency"
FROM "Contract" AS c
WHERE te."contractId" = c."id"
  AND te."workspaceId" = c."workspaceId"
  AND te."clientId" = c."clientId";

ALTER TABLE "TimeEntry"
ALTER COLUMN "snapshotBillingModel" SET NOT NULL,
ALTER COLUMN "snapshotRate" SET NOT NULL,
ALTER COLUMN "snapshotCurrency" SET NOT NULL;

ALTER TABLE "TimeEntry"
ADD CONSTRAINT "TimeEntry_snapshotRate_positive"
CHECK ("snapshotRate" > 0);
