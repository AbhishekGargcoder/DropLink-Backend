-- CreateEnum
CREATE TYPE "SharedTextType" AS ENUM ('TEXT', 'LINK');

-- CreateTable
CREATE TABLE "SharedText" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "type" "SharedTextType" NOT NULL,
    "senderDeviceId" TEXT NOT NULL,
    "receiverDeviceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" TIMESTAMP(3),

    CONSTRAINT "SharedText_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "SharedText" ADD CONSTRAINT "SharedText_senderDeviceId_fkey" FOREIGN KEY ("senderDeviceId") REFERENCES "Device"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SharedText" ADD CONSTRAINT "SharedText_receiverDeviceId_fkey" FOREIGN KEY ("receiverDeviceId") REFERENCES "Device"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
