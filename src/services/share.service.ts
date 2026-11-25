
import prisma  from "../config/prisma.js";
import { SharedTextType } from "../generated/prisma/enums.js";
import { getIoInstance } from "../socket/socket.js";

interface ShareTextInput {
    senderDeviceId: string;
    receiverDeviceId: string;
    content: string;
    type: SharedTextType;
}

export const shareText = async (data: ShareTextInput) => {

    const {
        senderDeviceId,
        receiverDeviceId,
        content,
        type
    } = data;

    // 1. Prevent sending content to yourself
    if (senderDeviceId === receiverDeviceId) {
        throw new Error("Cannot share content with yourself");
    }

    // 2. Find the pairing relationship
    const pairing = await prisma.devicePairing.findFirst({
        where: {
            OR: [
                {
                    deviceAId: senderDeviceId,
                    deviceBId: receiverDeviceId
                },
                {
                    deviceAId: receiverDeviceId,
                    deviceBId: senderDeviceId
                }
            ]
        }
    });

    // 3. Verify that both devices are paired
    if (!pairing) {
        throw new Error("These devices are not paired");
    }

    // 4. Save the shared content to DB
    const sharedText = await prisma.sharedText.create({
        data: {
            senderDeviceId,
            receiverDeviceId,
            content,
            type
        },
        include: {
            senderDevice: {
                select: {
                    id: true,
                    deviceName: true,
                    deviceType: true
                }
            },
            receiverDevice: {
                select: {
                    id: true,
                    deviceName: true,
                    deviceType: true
                }
            }
        }
    });
    // Notify only the receiver.
    try {
        const io = getIoInstance()
        // Emit the "share:new" event to the receiver's room
        io.to(`device:${receiverDeviceId}`)
            .emit("share:new", {
                id: sharedText.id,
                content: sharedText.content,
                type: sharedText.type,
                senderDeviceId: sharedText.senderDeviceId,
                receiverDeviceId: sharedText.receiverDeviceId,
                createdAt: sharedText.createdAt,
                senderDevice: sharedText.senderDevice,
                receiverDevice: sharedText.receiverDevice
            });
        console.log(`Emitting share:new to device:${receiverDeviceId} room`);
    } catch (error) {
        console.error("Share notification failed:", error);
    }
    
    return sharedText;
};

// retrieving all text messages sent to me or send by me=> COmplete chat history
export const getSharedTexts = async (deviceId:string)=>{ 
    // params: receiverDeviceId = could be phone/laptop
         const sharedTexts = await prisma.sharedText.findMany({
        where: {
            OR: [{
                    senderDeviceId: deviceId
                },{
                    receiverDeviceId: deviceId
                }]
        },
        include: {
            senderDevice: {
                select: {
                    id: true,
                    deviceName: true,
                    deviceType: true
                }
            },
            receiverDevice: {
                select: {
                    id: true,
                    deviceName: true,
                    deviceType: true
                }
            }
        },
        orderBy: {
            createdAt: "desc"
        }
    });
    return sharedTexts;
};

// mark message as READ only by "RECEIVER".
export const markShareAsRead = async (
    shareId: any,
    receiverDeviceId: string
) => {
    // Only the receiver can mark this share as read.
    const result = await prisma.sharedText.updateMany({
        where: {
            id: shareId,
            receiverDeviceId,
            readAt: null
        },
        data: {
            readAt: new Date()
        },
    });
    if (result.count === 0) {
        // Check whether the share belongs to this receiver.
        const existingShare = await prisma.sharedText.findFirst({
            where: {
                id: shareId,
                receiverDeviceId
            },
            select: {
                id: true,
                readAt: true
            }
        });
        if (!existingShare) {
            throw new Error(
                "Share not found or you are not its receiver"
            );
        }
        // Already read: treat this as a successful operation.
        return existingShare;
    }
    return await prisma.sharedText.findUnique({
        where: {
            id: shareId
        }
    });
};