-- Prisma-expressible unique keys required by composite workspace FKs.
CREATE UNIQUE INDEX "Alert_workspaceId_id_key" ON "Alert"("workspaceId", "id");

CREATE UNIQUE INDEX "Contract_workspaceId_id_key" ON "Contract"("workspaceId", "id");

-- Value constraints documented in docs/storage.md.
-- Prisma cannot express CHECK constraints.
ALTER TABLE "TimeEntry"
ADD CONSTRAINT "TimeEntry_durationMinutes_positive"
CHECK ("durationMinutes" > 0);

ALTER TABLE "Contract"
ADD CONSTRAINT "Contract_rate_positive"
CHECK ("rate" > 0);

ALTER TABLE "WorkspaceSettings"
ADD CONSTRAINT "WorkspaceSettings_contractWarningPercent_range"
CHECK ("contractWarningPercent" > 0 AND "contractWarningPercent" <= 100);

ALTER TABLE "WorkspaceSettings"
ADD CONSTRAINT "WorkspaceSettings_monthlyCapacityWarningPercent_range"
CHECK ("monthlyCapacityWarningPercent" > 0 AND "monthlyCapacityWarningPercent" <= 100);

-- Contract validity [validFrom, validTo). NULL validTo is open-ended (unbounded).
-- btree_gist allows equality on UUID alongside the range operator.
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE "Contract"
ADD CONSTRAINT "Contract_client_validity_no_overlap"
EXCLUDE USING gist (
    "workspaceId" WITH =,
    "clientId" WITH =,
    daterange("validFrom", "validTo", '[)') WITH &&
);

-- Cross-workspace integrity for optional Alert/Notification references.
-- MATCH SIMPLE: the composite FK is checked only when the optional id is non-null.
ALTER TABLE "Alert"
ADD CONSTRAINT "Alert_workspaceId_clientId_fkey"
FOREIGN KEY ("workspaceId", "clientId")
REFERENCES "Client"("workspaceId", "id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Alert"
ADD CONSTRAINT "Alert_workspaceId_contractId_fkey"
FOREIGN KEY ("workspaceId", "contractId")
REFERENCES "Contract"("workspaceId", "id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Notification"
ADD CONSTRAINT "Notification_workspaceId_alertId_fkey"
FOREIGN KEY ("workspaceId", "alertId")
REFERENCES "Alert"("workspaceId", "id")
ON DELETE RESTRICT ON UPDATE CASCADE;
