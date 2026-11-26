import type {Request,Response, ErrorRequestHandler } from "express";
import { HttpError } from "./HttpError.js";

export const errorHandlingMiddleware: ErrorRequestHandler = (err, _req: Request, res: Response, _next) => {
    const isFileTooLarge =
        err?.name === "MulterError" && err?.code === "LIMIT_FILE_SIZE";
    const statusCode = err instanceof HttpError
        ? err.statusCode
        : isFileTooLarge
            ? 413
            : 500;
    const message = err instanceof HttpError
        ? err.message
        : isFileTooLarge
            ? "File exceeds the 50 MB limit"
            : "Internal server error";
    res.status(statusCode).json({ success: false, statusCode, message });
}