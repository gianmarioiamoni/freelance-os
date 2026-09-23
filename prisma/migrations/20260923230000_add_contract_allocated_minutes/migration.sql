-- P-E04-01: optional Contract-level total time budget.
-- Null = no allocation. Zero = explicit zero allocation.
-- Distinct from monthlyContractedMinutes. Additive; existing rows stay NULL.

ALTER TABLE "Contract"
ADD COLUMN "allocatedMinutes" INTEGER;

ALTER TABLE "Contract"
ADD CONSTRAINT "Contract_allocatedMinutes_non_negative"
CHECK ("allocatedMinutes" IS NULL OR "allocatedMinutes" >= 0);
