import { createHash, randomBytes } from "node:crypto";
import prisma from "../config/prisma.js";
import { HttpError } from "../middleware/HttpError.js";

const RECOVERY_EXPIRY_MS = 2 * 60 * 1000;

interface CreateRecoveryInput {
    hostDeviceId: string;
    targetDeviceId: string;
}

interface ConfirmRecoveryInput {
    qrToken: string;
}

const hashToken = (token: string) => {
    return createHash("sha256").update(token).digest("hex");
};

/**
 * Laptop creates a recovery session for an already-paired phone.
 */
export const createDeviceRecoverySession = async (
    data: CreateRecoveryInput
) => {
    const { hostDeviceId, targetDeviceId } = data;

    // Verify that the host is a desktop and the target is a phone.
    const [hostDevice, targetDevice] = await Promise.all([
        prisma.device.findUnique({
            where: { id: hostDeviceId },
            select: { id: true, deviceType: true }
        }),
        prisma.device.findUnique({
            where: { id: targetDeviceId },
            select: { id: true, deviceType: true }
        })
    ]);

    if (!hostDevice || hostDevice.deviceType !== "DESKTOP") {
        throw new HttpError(404, "Invalid host device");
    }
    if (!targetDevice || targetDevice.deviceType !== "MOBILE") {
        throw new HttpError(404, "Invalid target phone");
    }

    // Verify that this phone is paired with this laptop before.
    const pairing = await prisma.devicePairing.findFirst({
        where: {
            deviceAId: hostDeviceId,
            deviceBId: targetDeviceId
        }
    });

    if (!pairing) {
        throw new HttpError(409, "This phone is not paired with your laptop");
    }

    // devicePairing exists, so we can create a recovery session for this phone.
    // Generate a random token. Store only its hash.
    // INITIATE RecoverySession : 
    const qrToken = randomBytes(32).toString("base64url");
    const tokenHash = hashToken(qrToken);

    const expiresAt = new Date(Date.now() + RECOVERY_EXPIRY_MS);

    const session = await prisma.deviceRecoverySession.create({
        data: {
            tokenHash,
            hostDeviceId,
            targetDeviceId,
            expiresAt
        },
        select: {
            id: true,
            expiresAt: true
        }
    });

    // Return the raw token only once to the laptop.
    return {
        sessionId: session.id,
        qrToken,
        expiresAt: session.expiresAt
    };
};

/**
 * Phone scans the QR and requests a new credential.
 */
export const confirmDeviceRecovery = async (
    data: ConfirmRecoveryInput
) => {

// 1. phone scans QR displayed on laptop, and sends the qrToken to backend
// 2. verify tokenHash exists in DB and is not expired
// 3. Don't register phone again as it's already in DB so just 
// 4. generate new credential and update the existing phone's credentialHash in DB

    const tokenHash = hashToken(data.qrToken);
    const now = new Date();

    const result = await prisma.$transaction(async (tx) => {
//   1.
        const session = await tx.deviceRecoverySession.findUnique({
            where: { tokenHash },
            include: {
                hostDevice: {
                    select: {
                        id: true,
                        deviceType: true
                    }
                },
                targetDevice: {
                    select: {
                        id: true,
                        deviceType: true
                    }
                }
            }
        });

        if (!session) {
            throw new HttpError(400, "Invalid recovery QR code");
        }

        if (session.expiresAt <= now) {
            throw new HttpError(410, "Recovery session has expired");
        }
        if (session.completedAt) {
            throw new HttpError(409, "Recovery session has already been used");
        }

        if (
            session.hostDevice.deviceType !== "DESKTOP" ||
            session.targetDevice.deviceType !== "MOBILE"
        ) {
            throw new HttpError(409, "Invalid recovery devices");
        }

        // Confirm that the original pairing still exists.
        const pairing = await tx.devicePairing.findFirst({
            where: {
                deviceAId: session.hostDeviceId, // laptop's deviceId
                deviceBId: session.targetDeviceId // phone's deviceId
            }
        });

        if (!pairing) {
            throw new HttpError(409, "Phone is no longer paired with this laptop");
        }

        // CREATE A NEW CREDENTIAL AND HAND OVER TO THE PHONE WHO LOST ITS CREDENTIAL
        // Generate the replacement phone credential.
        const credential = randomBytes(32).toString("base64url");
        const credentialHash = hashToken(credential);

        // Atomically claim the recovery session.
        const claimedSession = await tx.deviceRecoverySession.updateMany({
            where: {
                id: session.id,
                completedAt: null,
                expiresAt: { gt: now }
            },
            data: {
                completedAt: now // marks recovery session as used
            }
        });

        if (claimedSession.count !== 1) {
            throw new HttpError(409, "Recovery session is no longer available");
        }

        // Replace the credential on the EXISTING phone IN DB.
        const recoveredDevice = await tx.device.update({
            where: {
                id: session.targetDeviceId // target phone id
            },
            data: {
                credentialHash // store new credential hash for the phone
            },
            select: {
                id: true,
                deviceName: true,
                deviceType: true,
                platform: true
            }
        });

        // Invalidate other pending recovery sessions for this phone.
        await tx.deviceRecoverySession.updateMany({
            where: {
                targetDeviceId: session.targetDeviceId,
                id: { not: session.id },
                completedAt: null
            },
            data: {
                expiresAt: now
            }
        });

        return {
            device: recoveredDevice,
            credential
        };
    });

    return result;
};