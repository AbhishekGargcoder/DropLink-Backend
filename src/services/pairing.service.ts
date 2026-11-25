import { randomBytes, createHash } from "node:crypto";
import prisma from "../config/prisma.js";

export const createPairingSession = async (hostDeviceId: string) => {
    // steps : 1). generate QR-token & its expiry and 2). save to db
    console.log("SERVICE :create Pairing Session route hit ");
    // 1. Generate a secure random token
    const qrtoken = randomBytes(32).toString("base64url");
    // 2. Hash the token before storing it
    const hashedQRToken = createHash("sha256")
        .update(qrtoken)
        .digest("hex");
    // 3. Pairing session expires after 2 minutes
    const expiresAt = new Date(Date.now() + 2 * 60 * 1000);
    console.log("QR-token: ", qrtoken);
    // 4. Save the session in PostgreSQL
    const session = await prisma.pairingSession.create({
        data: {
            tokenHash: hashedQRToken,
            hostDeviceId,
            expiresAt
        },
        select: {
            id: true,
            expiresAt: true
        }
    });
    // 5. Return the raw token only to the laptop
    return {
        sessionId: session.id,
        qrtoken,
        expiresAt: session.expiresAt
    };
}
interface ConfirmPairingInput {
    qrToken: string;
    deviceName: string;
    platform: "ANDROID" | "IOS" | "UNKNOWN";
    existingCredential?: string; // If phone already has a device identity
}

export const confirmPairingSession = async (data: ConfirmPairingInput) => {

    // 1. Hash the token received from the phone
    const hashedQRToken = createHash("sha256")
        .update(data.qrToken)
        .digest("hex");
    console.log("tokenHash", hashedQRToken);

    // 2. Find the pairing session
    const session = await prisma.pairingSession.findUnique({
        where: { tokenHash: hashedQRToken }
    });

    if (!session) {
        throw new Error("Invalid pairing QR-token");
    }
    const now = new Date();
    if (session.expiresAt <= now) {
        throw new Error("Pairing session has expired");
    }
    if (session.completedAt) {
        throw new Error("Pairing session has already been used");
    }

    // 3. Check if phone already has a valid device identity
    let existingDevice = null;
    if (data.existingCredential) {
        const existingCredentialHash = createHash("sha256")
            .update(data.existingCredential)
            .digest("hex");
        existingDevice = await prisma.device.findUnique({
            where: { credentialHash: existingCredentialHash },
            select: { id: true, deviceName: true, deviceType: true, platform: true }
        });
    }

    if (existingDevice) {
        // RE-PAIRING: Reuse existing device, just create new pairing link
        console.log("Re-pairing existing device:", existingDevice.id);
        await prisma.$transaction(async (tx) => {
            // Claim the session
            const claimedSession = await tx.pairingSession.updateMany({
                where: {
                    id: session.id,
                    completedAt: null,
                    expiresAt: { gt: now }
                },
                data: {
                    completedAt: now,
                    joinedDeviceId: existingDevice!.id
                }
            });
            if (claimedSession.count !== 1) {
                throw new Error("Pairing session is no longer available");
            }
            // Remove any old pairing between these two devices (in case they were paired before)
            await tx.devicePairing.deleteMany({
                where: {
                    OR: [
                        { deviceAId: session.hostDeviceId, deviceBId: existingDevice!.id },
                        { deviceAId: existingDevice!.id, deviceBId: session.hostDeviceId }
                    ]
                }
            });
            // Create fresh pairing link
            await tx.devicePairing.create({
                data: {
                    deviceAId: session.hostDeviceId,
                    deviceBId: existingDevice!.id
                }
            });
            // Update device name if changed
            if (data.deviceName && data.deviceName !== existingDevice!.deviceName) {
                await tx.device.update({
                    where: { id: existingDevice!.id },
                    data: { deviceName: data.deviceName }
                });
                existingDevice!.deviceName = data.deviceName;
            }
        });

        // Return the SAME credential so phone keeps its identity
        return {
            device: existingDevice,
            credential: data.existingCredential!
        };
    }

    // NEW DEVICE: Generate a new credential and register
    const credential = randomBytes(32).toString("base64url");
    const credentialHash = createHash("sha256")
        .update(credential)
        .digest("hex");

    const phone = await prisma.$transaction(async (tx) => {
        const newDevice = await tx.device.create({
            data: {
                deviceName: data.deviceName,
                deviceType: "MOBILE",
                platform: data.platform,
                credentialHash
            },
            select: {
                id: true,
                deviceName: true,
                deviceType: true,
                platform: true
            }
        });
        const claimedSession = await tx.pairingSession.updateMany({
            where: {
                id: session.id,
                completedAt: null,
                expiresAt: { gt: now }
            },
            data: {
                completedAt: now,
                joinedDeviceId: newDevice.id
            }
        });
        if (claimedSession.count !== 1) {
            throw new Error("Pairing session is no longer available");
        }
        await tx.devicePairing.create({
            data: {
                deviceAId: session.hostDeviceId,
                deviceBId: newDevice.id
            }
        });
        return newDevice;
    });

    return {
        device: phone,
        credential
    };
}
//  @ts-ignore
export const getPairingStatus = async (sessionId: any, hostDeviceId: string) => {
    // Find a session belonging to this authenticated laptop
    const currSession = await prisma.pairingSession.findFirst({
        where: {
            id: sessionId,
            hostDeviceId
        },
        select: {
            id: true,
            expiresAt: true,
            completedAt: true,
            joinedDevice: {
                select: {
                    id: true,
                    deviceName: true,
                    deviceType: true,
                    platform: true,
                    lastSeenAt: true
                }
            }
        }
    });

    if (!currSession) {
        throw new Error("Pairing session not found");
    }
    // Determine the current status
    if (currSession.completedAt) {
        return {
            sessionId: currSession.id,
            status: "COMPLETED",
            pairedDevice: currSession.joinedDevice
        };
    }
    if (currSession?.expiresAt <= new Date()) {
        return {
            sessionId: currSession.id,
            status: "EXPIRED",
            pairedDevice: null
        }
    }
    return {
        sessionId: currSession.id,
        status: "PENDING",
        pairedDevice: null
    };
}