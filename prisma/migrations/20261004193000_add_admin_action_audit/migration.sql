-- CreateEnum
CREATE TYPE "AdminActionType" AS ENUM ('DISABLE_USER', 'ENABLE_USER', 'DELETE_USER');

-- CreateTable
CREATE TABLE "AdminAction" (
    "id" UUID NOT NULL,
    "adminUserId" TEXT NOT NULL,
    "targetUserId" TEXT NOT NULL,
    "action" "AdminActionType" NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminAction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AdminAction_adminUserId_createdAt_idx" ON "AdminAction"("adminUserId", "createdAt");

-- CreateIndex
CREATE INDEX "AdminAction_targetUserId_idx" ON "AdminAction"("targetUserId");
