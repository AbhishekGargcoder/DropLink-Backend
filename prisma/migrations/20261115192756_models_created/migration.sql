-- CreateEnum
CREATE TYPE "DeviceType" AS ENUM ('DESKTOP', 'MOBILE');

-- CreateEnum
CREATE TYPE "DevicePlatform" AS ENUM ('WINDOWS', 'ANDROID', 'IOS', 'MACOS', 'LINUX', 'UNKNOWN');

-- CreateTable
CREATE TABLE "Device" (
    "id" TEXT NOT NULL,
    "deviceName" TEXT NOT NULL,
    "deviceType" "DeviceType" NOT NULL,
    "platform" "DevicePlatform" NOT NULL DEFAULT 'UNKNOWN',
    "credentialHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Device_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PairingSession" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "hostDeviceId" TEXT NOT NULL,
    "joinedDeviceId" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PairingSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DevicePairing" (
    "id" TEXT NOT NULL,
    "deviceAId" TEXT NOT NULL,
    "deviceBId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DevicePairing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SharedFile" (
    "id" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" BIGINT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "senderDeviceId" TEXT NOT NULL,
    "receiverDeviceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SharedFile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Device_credentialHash_key" ON "Device"("credentialHash");

-- CreateIndex
CREATE UNIQUE INDEX "PairingSession_tokenHash_key" ON "PairingSession"("tokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "DevicePairing_deviceAId_deviceBId_key" ON "DevicePairing"("deviceAId", "deviceBId");

-- AddForeignKey
ALTER TABLE "PairingSession" ADD CONSTRAINT "PairingSession_hostDeviceId_fkey" FOREIGN KEY ("hostDeviceId") REFERENCES "Device"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PairingSession" ADD CONSTRAINT "PairingSession_joinedDeviceId_fkey" FOREIGN KEY ("joinedDeviceId") REFERENCES "Device"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DevicePairing" ADD CONSTRAINT "DevicePairing_deviceAId_fkey" FOREIGN KEY ("deviceAId") REFERENCES "Device"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DevicePairing" ADD CONSTRAINT "DevicePairing_deviceBId_fkey" FOREIGN KEY ("deviceBId") REFERENCES "Device"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
