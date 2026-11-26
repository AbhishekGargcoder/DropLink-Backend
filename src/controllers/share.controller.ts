import type { RequestHandler,Request,Response} from "express";
import { shareText,getSharedTexts, markShareAsRead} from "../services/share.service.js";

export const createShare: RequestHandler = async (req, res, next) => {
    try {
        // The sender is always the authenticated device.
        const senderDeviceId = res.locals.device.id;

        const { receiverDeviceId, content, type } = req.body ?? {};

        const uuidRegex =
            /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        if (
            typeof receiverDeviceId !== "string" ||
            !uuidRegex.test(receiverDeviceId)
        ) {
            res.status(400).json({
                success: false,
                message: "Invalid receiver device ID"
            });
            return;
        }

        // Validate content
        if (
            typeof content !== "string" ||
            content.trim().length === 0 ||
            content.length > 10000
        ) {
            res.status(400).json({
                success: false,
                message: "Content must be between 1 and 10000 characters"
            });
            return;
        }

        // Validate content type
        if (type !== "TEXT" && type !== "LINK") {
            res.status(400).json({
                success: false,
                message: "Type must be TEXT or LINK"
            });
            return;
        }

        // For LINK, accept only valid HTTP or HTTPS URLs.
        if (type === "LINK") {
            try {
                const url = new URL(content.trim());

                if (!["http:", "https:"].includes(url.protocol)) {
                    throw new Error("Unsupported URL protocol");
                }
            } catch {
                res.status(400).json({
                    success: false,
                    message: "Please provide a valid HTTP or HTTPS link"
                });
                return;
            }
        }

        const sharedText = await shareText({
            senderDeviceId,
            receiverDeviceId,
            content: content.trim(),
            type
        });

        res.status(201).json({
            success: true,
            message: "Content shared successfully",
            data: sharedText
        });

    } catch (error) {
        next(error);
    }
};

// get all messages sentto/received from => complete chat history to FE to show to user
export const listSharedTexts: RequestHandler = async (req,res,next) => {
    try {
        const deviceId = res.locals.device.id;
        const sharedTexts = await getSharedTexts(deviceId);
        res.status(200).json({
            success: true,
            count: sharedTexts.length,
            data: sharedTexts
        });
    } catch (error) {
        next(error);
    }
};
// mark as read the message wheen seen by receiver
export const markAsRead: RequestHandler = async (
    req,
    res,
    next
) => {
    try {
        const receiverDeviceId = res.locals.device.id;
        const { shareId } = req.params;

        const result = await markShareAsRead(
            shareId,
            receiverDeviceId
        );

        res.status(200).json({
            success: true,
            message: "Share marked as read",
            data: result
        });

    } catch (error) {
        next(error);
    }
};
