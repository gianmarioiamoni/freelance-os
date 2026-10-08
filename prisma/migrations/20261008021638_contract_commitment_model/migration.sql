/*
  Warnings:

  - You are about to drop the column `monthlyContractedMinutes` on the `Contract` table. All the data in the column will be lost.
  - Added the required column `commitmentMode` to the `Contract` table without a default value. This is not possible if the table is not empty.
  - Added the required column `commitmentPercentage` to the `Contract` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "CommitmentMode" AS ENUM ('PERCENTAGE', 'TOTAL_HOURS');

-- DropForeignKey
ALTER TABLE "Alert" DROP CONSTRAINT "Alert_workspaceId_clientId_fkey";

-- DropForeignKey
ALTER TABLE "Alert" DROP CONSTRAINT "Alert_workspaceId_contractId_fkey";

-- DropForeignKey
ALTER TABLE "Alert" DROP CONSTRAINT "Alert_workspaceId_invoiceId_fkey";

-- DropForeignKey
ALTER TABLE "Notification" DROP CONSTRAINT "Notification_workspaceId_alertId_fkey";

-- AlterTable
ALTER TABLE "Contract" DROP COLUMN "monthlyContractedMinutes",
ADD COLUMN     "commitmentMode" "CommitmentMode" NOT NULL,
ADD COLUMN     "commitmentPercentage" DECIMAL(5,2) NOT NULL;
