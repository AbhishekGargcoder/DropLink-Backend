
import { randomBytes, createHash } from "node:crypto";
import { DeviceType, DevicePlatform } from "../generated/prisma/enums.js";
import prisma from "../config/prisma.js";
import { HttpError } from "../middleware/HttpError.js";

interface RegisterDeviceInput {
    deviceName: string;
    deviceType: DeviceType; // laptop,phone
    platform: DevicePlatform; // OS-type
}

export const registerDevice = async (data: RegisterDeviceInput) => {
    // Generate a random credential for this device.
    const credential = randomBytes(32).toString("base64url");
    // Hash the secret before storing it
    const credentialHash = createHash("sha256")
        .update(credential)
        .digest("hex");
    // Save device information in PostgreSQL
    const device = await prisma.device.create({
        data: {
            deviceName: data.deviceName,
            deviceType: data.deviceType,
            platform: data.platform,
            credentialHash
        },
        select: {
            id: true,
            deviceName: true,
            deviceType: true,
            platform: true,
            createdAt: true
        }
    });

    // Return the secret only once
    return {
        device,
        credential
    };
};

export const renameDevice = async (
    deviceId: string,
    deviceName: string
) => {
    return prisma.device.update({
        where: { id: deviceId },
        data: { deviceName },
        select: {
            id: true,
            deviceName: true,
            deviceType: true,
            platform: true,
            createdAt: true,
            lastSeenAt: true
        }
    });
};

// retrieve all paired devices for a given device (laptop or phone)
export const getPairedDevices = async (
    deviceId: string
) => {
    // :deviceId is the laptop's deviceId
    const pairings = await prisma.devicePairing.findMany({
        where: {
            OR: [
                { deviceAId: deviceId },
                { deviceBId: deviceId }
            ]
        },
        include: {
            deviceA: {
                select: {
                    id: true,
                    deviceName: true,
                    deviceType: true,
                    platform: true,
                    lastSeenAt: true
                }
            },
            deviceB: {
                select: {
                    id: true,
                    deviceName: true,
                    deviceType: true,
                    platform: true,
                    lastSeenAt: true
                }
            }
        },
        orderBy: {
            createdAt: "desc"
        }
    });

    return pairings.map((pairing) =>
        pairing.deviceAId === deviceId ? pairing.deviceB : pairing.deviceA
    );
};

// Remove the connection between two devices
export const unpairDevice = async (
    currentDeviceId: string,
    targetDeviceId: string
) => {
    const result = await prisma.devicePairing.deleteMany({
        where: {
            OR: [
                { deviceAId: currentDeviceId, deviceBId: targetDeviceId },
                { deviceAId: targetDeviceId, deviceBId: currentDeviceId }
            ]
        },
    });

    if (result.count === 0) {
        throw new HttpError(404, "This device is not paired with you");
    }

    return {
        unpairedDeviceId: targetDeviceId
    };
};
// What happens when we unpair?
// ** Before unpairing Event:
// DevicePairing Table :
// Laptop-1 ↔ Phone-1

// PairingSession Table:
// Session-1 — COMPLETED

// ** After unpairing Event:
// DevicePairing Table :
// Laptop-1 ↔ Phone-1  ---------   Deleted
// No active relationship between Laptop-1 and Phone-1

// PairingSession Table :
// Session-1 — COMPLETED    ------------ Retained
// Why retain the session?
// 1. It preserves the pairing history.
// 2. It prevents an old QR token from being reused.
// 3. It keeps the pairing attempt separate from the active device relationship.