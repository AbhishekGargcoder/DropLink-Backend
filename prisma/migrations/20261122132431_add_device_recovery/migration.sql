-- CreateTable
CREATE TABLE "DeviceRecoverySession" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "hostDeviceId" TEXT NOT NULL,
    "targetDeviceId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeviceRecoverySession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DeviceRecoverySession_tokenHash_key" ON "DeviceRecoverySession"("tokenHash");

-- CreateIndex
CREATE INDEX "DeviceRecoverySession_hostDeviceId_idx" ON "DeviceRecoverySession"("hostDeviceId");

-- CreateIndex
CREATE INDEX "DeviceRecoverySession_targetDeviceId_idx" ON "DeviceRecoverySession"("targetDeviceId");

-- AddForeignKey
ALTER TABLE "DeviceRecoverySession" ADD CONSTRAINT "DeviceRecoverySession_hostDeviceId_fkey" FOREIGN KEY ("hostDeviceId") REFERENCES "Device"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeviceRecoverySession" ADD CONSTRAINT "DeviceRecoverySession_targetDeviceId_fkey" FOREIGN KEY ("targetDeviceId") REFERENCES "Device"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
