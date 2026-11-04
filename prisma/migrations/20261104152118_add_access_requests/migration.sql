-- CreateEnum
CREATE TYPE "AccessRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "AccessRequest" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "status" "AccessRequestStatus" NOT NULL DEFAULT 'PENDING',
    "token" TEXT NOT NULL,
    "tokenExpiresAt" TIMESTAMPTZ(6),
    "requestedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMPTZ(6),
    "reviewedBy" TEXT,
    "rejectionReason" TEXT,

    CONSTRAINT "AccessRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AccessRequest_email_key" ON "AccessRequest"("email");

-- CreateIndex
CREATE UNIQUE INDEX "AccessRequest_token_key" ON "AccessRequest"("token");

-- CreateIndex
CREATE INDEX "AccessRequest_status_requestedAt_idx" ON "AccessRequest"("status", "requestedAt");

-- CreateIndex
CREATE INDEX "AccessRequest_email_status_idx" ON "AccessRequest"("email", "status");

-- AddForeignKey
ALTER TABLE "AccessRequest" ADD CONSTRAINT "AccessRequest_reviewedBy_fkey" FOREIGN KEY ("reviewedBy") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
