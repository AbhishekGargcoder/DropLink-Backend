/*
  Warnings:

  - Added the required column `storedName` to the `SharedFile` table without a default value. This is not possible if the table is not empty.
  - Made the column `receiverDeviceId` on table `SharedFile` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "SharedFileStatus" AS ENUM ('AVAILABLE', 'DELETED', 'EXPIRED');

-- AlterTable
ALTER TABLE "SharedFile" ADD COLUMN     "expiresAt" TIMESTAMP(3),
ADD COLUMN     "readAt" TIMESTAMP(3),
ADD COLUMN     "status" "SharedFileStatus" NOT NULL DEFAULT 'AVAILABLE',
ADD COLUMN     "storedName" TEXT NOT NULL,
ALTER COLUMN "receiverDeviceId" SET NOT NULL;

-- CreateIndex
CREATE INDEX "SharedFile_senderDeviceId_idx" ON "SharedFile"("senderDeviceId");

-- CreateIndex
CREATE INDEX "SharedFile_receiverDeviceId_idx" ON "SharedFile"("receiverDeviceId");

-- CreateIndex
CREATE INDEX "SharedFile_createdAt_idx" ON "SharedFile"("createdAt");

-- AddForeignKey
ALTER TABLE "SharedFile" ADD CONSTRAINT "SharedFile_senderDeviceId_fkey" FOREIGN KEY ("senderDeviceId") REFERENCES "Device"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SharedFile" ADD CONSTRAINT "SharedFile_receiverDeviceId_fkey" FOREIGN KEY ("receiverDeviceId") REFERENCES "Device"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
