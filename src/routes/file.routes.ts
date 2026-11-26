import express from "express";
import multer from "multer";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { mkdir } from "node:fs/promises";
import { authenticateDevice } from "../middleware/auth.middleware.js";
import {
    downloadFile,
    listFiles,
    uploadFile
} from "../controllers/file.controller.js";

const UPLOAD_ROOT = path.resolve(process.cwd(), "uploads/");
await mkdir(UPLOAD_ROOT, { recursive: true });

const storage = multer.diskStorage({
    destination: (_req, _file, callback) => callback(null, UPLOAD_ROOT),
    filename: (_req, file, callback) => {
        const extension = path.extname(file.originalname).toLowerCase();
        callback(null, `${randomUUID()}${extension}`);
    }
});

const upload = multer({
    storage,
    limits: {
        fileSize: 50 * 1024 * 1024,
        files: 1
    }
});

const fileRouter = express.Router();

fileRouter.post(
    "/upload",
    authenticateDevice,
    upload.single("file"),
    uploadFile
);
fileRouter.get("/", authenticateDevice, listFiles);
fileRouter.get("/:fileId/download", authenticateDevice, downloadFile);

export default fileRouter;
