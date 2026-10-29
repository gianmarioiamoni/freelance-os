-- CreateEnum
CREATE TYPE "ViewerAccessStatus" AS ENUM ('PENDING', 'ACTIVE', 'REVOKED');

-- CreateEnum
CREATE TYPE "AnomalyReportStatus" AS ENUM ('OPEN', 'ACKNOWLEDGED', 'RESOLVED');

-- CreateTable
CREATE TABLE "TimesheetViewerAccess" (
    "id" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "userId" TEXT,
    "email" TEXT NOT NULL,
    "status" "ViewerAccessStatus" NOT NULL,
    "invitedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "activatedAt" TIMESTAMPTZ(6),
    "revokedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "TimesheetViewerAccess_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimesheetViewerContract" (
    "viewerAccessId" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "contractId" UUID NOT NULL,
    "displayLabel" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "TimesheetViewerContract_pkey" PRIMARY KEY ("viewerAccessId","contractId")
);

-- CreateTable
CREATE TABLE "ViewerInviteToken" (
    "id" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "viewerAccessId" UUID NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMPTZ(6) NOT NULL,
    "acceptedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ViewerInviteToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnomalyReport" (
    "id" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "viewerAccessId" UUID NOT NULL,
    "timeEntryId" UUID,
    "workDate" DATE NOT NULL,
    "message" TEXT NOT NULL,
    "status" "AnomalyReportStatus" NOT NULL,
    "freelanceNotes" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acknowledgedAt" TIMESTAMPTZ(6),
    "resolvedAt" TIMESTAMPTZ(6),

    CONSTRAINT "AnomalyReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TimesheetViewerAccess_workspaceId_id_key" ON "TimesheetViewerAccess"("workspaceId", "id");

-- CreateIndex
CREATE INDEX "TimesheetViewerAccess_workspaceId_status_idx" ON "TimesheetViewerAccess"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "TimesheetViewerAccess_userId_status_idx" ON "TimesheetViewerAccess"("userId", "status");

-- CreateIndex
CREATE INDEX "TimesheetViewerAccess_email_idx" ON "TimesheetViewerAccess"("email");

-- CreateIndex
CREATE UNIQUE INDEX "TimesheetViewerContract_workspaceId_viewerAccessId_contractId_key" ON "TimesheetViewerContract"("workspaceId", "viewerAccessId", "contractId");

-- CreateIndex
CREATE INDEX "TimesheetViewerContract_workspaceId_contractId_idx" ON "TimesheetViewerContract"("workspaceId", "contractId");

-- CreateIndex
CREATE UNIQUE INDEX "ViewerInviteToken_tokenHash_key" ON "ViewerInviteToken"("tokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "ViewerInviteToken_workspaceId_id_key" ON "ViewerInviteToken"("workspaceId", "id");

-- CreateIndex
CREATE INDEX "ViewerInviteToken_tokenHash_expiresAt_idx" ON "ViewerInviteToken"("tokenHash", "expiresAt");

-- CreateIndex
CREATE INDEX "ViewerInviteToken_viewerAccessId_idx" ON "ViewerInviteToken"("viewerAccessId");

-- CreateIndex
CREATE UNIQUE INDEX "AnomalyReport_workspaceId_id_key" ON "AnomalyReport"("workspaceId", "id");

-- CreateIndex
CREATE INDEX "AnomalyReport_workspaceId_status_createdAt_idx" ON "AnomalyReport"("workspaceId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "AnomalyReport_workspaceId_viewerAccessId_status_idx" ON "AnomalyReport"("workspaceId", "viewerAccessId", "status");

-- CreateIndex
CREATE INDEX "AnomalyReport_workDate_idx" ON "AnomalyReport"("workDate");

-- AddForeignKey
ALTER TABLE "TimesheetViewerAccess" ADD CONSTRAINT "TimesheetViewerAccess_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimesheetViewerContract" ADD CONSTRAINT "TimesheetViewerContract_workspaceId_viewerAccessId_fkey" FOREIGN KEY ("workspaceId", "viewerAccessId") REFERENCES "TimesheetViewerAccess"("workspaceId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimesheetViewerContract" ADD CONSTRAINT "TimesheetViewerContract_workspaceId_contractId_fkey" FOREIGN KEY ("workspaceId", "contractId") REFERENCES "Contract"("workspaceId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ViewerInviteToken" ADD CONSTRAINT "ViewerInviteToken_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ViewerInviteToken" ADD CONSTRAINT "ViewerInviteToken_workspaceId_viewerAccessId_fkey" FOREIGN KEY ("workspaceId", "viewerAccessId") REFERENCES "TimesheetViewerAccess"("workspaceId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnomalyReport" ADD CONSTRAINT "AnomalyReport_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnomalyReport" ADD CONSTRAINT "AnomalyReport_workspaceId_viewerAccessId_fkey" FOREIGN KEY ("workspaceId", "viewerAccessId") REFERENCES "TimesheetViewerAccess"("workspaceId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Constraints that Prisma cannot express (following pattern from establish_persistence_invariants.sql)

-- TimesheetViewerAccess: userId NULL iff status = PENDING
ALTER TABLE "TimesheetViewerAccess"
ADD CONSTRAINT "TimesheetViewerAccess_userId_status_consistency"
CHECK (("userId" IS NULL) = (status = 'PENDING'));

-- Partial unique index: only one ACTIVE access per userId per workspace
CREATE UNIQUE INDEX "TimesheetViewerAccess_workspaceId_userId_active_key" 
ON "TimesheetViewerAccess"("workspaceId", "userId") 
WHERE status = 'ACTIVE' AND "userId" IS NOT NULL;
