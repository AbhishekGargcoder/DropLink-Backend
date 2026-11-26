import "dotenv/config";
import type { RequestHandler } from "express";
import { createHash } from "node:crypto";
import prisma from "../config/prisma.js";

export const authenticateDevice: RequestHandler = async (req,res,next) => {
    try {
        // 1. Read Authorization header
        const authHeader = req.headers.authorization;
        const credential = authHeader?.match(/^Bearer\s+(\S+)$/i)?.[1];
        if (!credential) {
            res.status(401).json({
                success: false,
                message: "Device credential is required"
            });
            return;
        }
        // 2. Extract Bearer credential (original form mai hai) 
        // 3. Hash the received credential
        const credentialHash = createHash("sha256")
            .update(credential)
            .digest("hex");

        // 4. Find the device using its credential hash
        const device = await prisma.device.findUnique({
            where: {
                credentialHash
            },
            select: {
                id: true,
                deviceName: true,
                deviceType: true,
                platform: true
            }
        });
        // 5. Reject invalid credentials
        if (!device) {
            res.status(401).json({
                success: false,
                message: "Invalid device credential"
            });
            return;
        }
        // 6. Store authenticated device for the next handler
        res.locals.device = device;
        // 7. Continue to controller
        next();
    } catch (error) {
        next(error); // call custom error handler
    }
};