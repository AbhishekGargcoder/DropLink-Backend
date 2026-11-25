import type { RequestHandler } from "express";
import path from "node:path";
import {
    createSharedFile,
    deleteUploadedFile,
    ensureUploadDirectory,
    getAuthorizedSharedFile,
    getSharedFilesForDevice
} from "../services/file.service.js";

const MAX_FILE_SIZE = 50 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set([
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
]);

export const uploadFile: RequestHandler = async (req, res, next) => {
    const uploadedFile = req.file;
    try {
        const senderDeviceId = res.locals.device.id; // laptop ya phone ka device id
        const { receiverDeviceId } = req.body; // laptop ya phone ka device id

        if (
            typeof receiverDeviceId !== "string" ||
            receiverDeviceId.length === 0
        ) {
            if (uploadedFile) await deleteUploadedFile(uploadedFile.path);
            res.status(400).json({
                success: false,
                message: "A valid receiver device ID is required"
            });
            return;
        }

        if (!uploadedFile) {
            res.status(400).json({
                success: false,
                message: "A file is required"
            });
            return;
        }

        if (uploadedFile.size > MAX_FILE_SIZE) {
            await deleteUploadedFile(uploadedFile.path);
            res.status(413).json({
                success: false,
                message: "File exceeds the 50 MB limit"
            });
            return;
        }

        if (!ALLOWED_MIME_TYPES.has(uploadedFile.mimetype)) {
            await deleteUploadedFile(uploadedFile.path);
            res.status(400).json({
                success: false,
                message: "Unsupported file type"
            });
            return;
        }

        await ensureUploadDirectory();
        const sharedFile = await createSharedFile({
            senderDeviceId,
            receiverDeviceId,
            fileName: path.basename(uploadedFile.originalname).slice(0, 255),
            storedName: path.basename(uploadedFile.filename),
            mimeType: uploadedFile.mimetype,
            size: uploadedFile.size,
            storagePath: uploadedFile.path
        });

        res.status(201).json({
            success: true,
            message: "File uploaded successfully",
            data: sharedFile
        });
    } catch (error) {
        if (uploadedFile) await deleteUploadedFile(uploadedFile.path);
        next(error);
    }
};

export const listFiles: RequestHandler = async (req, res, next) => {
    try {
        const files = await getSharedFilesForDevice(res.locals.device.id);
        res.status(200).json({
            success: true,
            count: files.length,
            data: files
        });
    } catch (error) {
        next(error);
    }
};

export const downloadFile: RequestHandler = async (req, res, next) => {
    try {
        const fileId = req.params.fileId;
        if (typeof fileId !== "string") {
            res.status(400).json({
                success: false,
                message: "A valid file ID is required"
            });
            return;
        }

        const file = await getAuthorizedSharedFile(
            fileId,
            res.locals.device.id
        );

        res.download(file.storagePath, file.fileName, (error) => {
            if (error) next(error);
        });
    } catch (error) {
        next(error);
    }
};
