import { randomUUID } from "node:crypto";
import { mkdir, unlink } from "node:fs/promises";
import path from "node:path";
import prisma from "../config/prisma.js";
import { getIoInstance } from "../socket/socket.js";

const UPLOAD_ROOT = path.resolve(process.cwd(), "uploads");

export const ensureUploadDirectory = async () => {
    await mkdir(UPLOAD_ROOT, { recursive: true });
};

export const createStoredFileName = (originalName: string) => {
    const extension = path.extname(originalName).toLowerCase();
    return `${randomUUID()}${extension}`;
};

export const serializeSharedFile = (file: any) => ({
    ...file,
    size: file.size.toString()
});

export const createSharedFile = async (data: {
    senderDeviceId: string;
    receiverDeviceId: string;
    fileName: string;
    storedName: string;
    mimeType: string;
    size: number;
    storagePath: string;
}) => {
    if (data.senderDeviceId === data.receiverDeviceId) {
        throw new Error("Cannot share a file with yourself");
    }

    const pairing = await prisma.devicePairing.findFirst({
        where: {
            OR: [
                {
                    deviceAId: data.senderDeviceId, // laptop
                    deviceBId: data.receiverDeviceId // phone
                },
                {
                    deviceAId: data.receiverDeviceId, // phone
                    deviceBId: data.senderDeviceId // laptop
                }
            ]
        }
    });

    if (!pairing) {
        throw new Error("These devices are not paired");
    }

    const sharedFile = await prisma.sharedFile.create({
        data: {
            fileName: data.fileName,
            storedName: data.storedName,
            mimeType: data.mimeType,
            size: data.size,
            storagePath: data.storagePath,
            senderDeviceId: data.senderDeviceId,
            receiverDeviceId: data.receiverDeviceId
        },
        include: {
            senderDevice: {
                select: { id: true, deviceName: true, deviceType: true }
            },
            receiverDevice: {
                select: { id: true, deviceName: true, deviceType: true }
            }
        }
    });
// create room and emit event to the receiver device's room
    getIoInstance().to(`device:${data.receiverDeviceId}`).emit("file:new", {
        id: sharedFile.id,
        fileName: sharedFile.fileName,
        mimeType: sharedFile.mimeType,
        size: sharedFile.size.toString(),
        senderDeviceId: sharedFile.senderDeviceId,
        receiverDeviceId: sharedFile.receiverDeviceId,
        createdAt: sharedFile.createdAt
    });

    return serializeSharedFile(sharedFile);
};

export const getSharedFilesForDevice = async (deviceId: string) => {
    // saari file history retrieve kr lo (either side file transfer)
    const files = await prisma.sharedFile.findMany({
        where: {
            status: "AVAILABLE",
            OR: [
                { senderDeviceId: deviceId },
                { receiverDeviceId: deviceId }
            ]
        },
        include: {
            senderDevice: {
                select: { id: true, deviceName: true, deviceType: true }
            },
            receiverDevice: {
                select: { id: true, deviceName: true, deviceType: true }
            }
        },
        orderBy: { createdAt: "desc" }
    });

    return files.map(serializeSharedFile);
};

export const getAuthorizedSharedFile = async (
    fileId: string,
    deviceId: string
) => {
    // retrieve the file if it exists and the device is either the sender or receiver
    const file = await prisma.sharedFile.findFirst({
        where: {
            id: fileId,
            status: "AVAILABLE",
            OR: [
                { senderDeviceId: deviceId },
                { receiverDeviceId: deviceId }
            ]
        }
    });

    if (!file) {
        throw new Error("File not found or you are not authorized to access it");
    }

    return file;
};

export const markSharedFileRead = async (
    fileId: string,
    receiverDeviceId: string
) => {
    return prisma.sharedFile.updateMany({
        where: {
            id: fileId,
            receiverDeviceId,
            readAt: null,
            status: "AVAILABLE"
        },
        data: { readAt: new Date() }
    });
};

export const deleteUploadedFile = async (storagePath: string) => {
    await unlink(storagePath).catch(() => undefined);
};
