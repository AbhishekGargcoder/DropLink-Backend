import { type Request, type Response, type RequestHandler } from "express";
import { createPairingSession, confirmPairingSession, getPairingStatus } from "../services/pairing.service.js";

export const createPairing: RequestHandler = async (req: Request, res: Response, next) => {
    console.log("CONTROLLER : createPairing hit")
    try {
        const device = res.locals.device; // The authentication middleware sets this value
        const session = await createPairingSession(device.id);
        res.status(201).json({
            success: true,
            message: "Pairing session created",
            data: session
        });
    } catch (error) {
        next(error);
    }
}

export const confirmPairing: RequestHandler = async (req: Request, res: Response, next) => {
    // Params :  {token, device_info} : deviceName,platform,deviceType: "MOBILE"
    console.log("CONTROLLER : confirmPairing hit")
    try {

        // 1). token => tokenHash
        // 2). check any pairing session available for this token
        // 3). check token expiry and number_of_usage >1
        // 4). do 3 operations atomically :
        //        #1. register phone device into our DB.
        //        #2. add this phone id to the active pairingSession
        //        #3. do mapping {hostDeviceId, joinedDeviceId}
        let { qrToken, deviceName, platform, existingCredential } = req.body ?? {};
        if (typeof qrToken !== "string" ) {
            res.status(400).json({
                success: false,
                message: "Invalid pairing token format"
            });
            return;
        }

        if (
            typeof deviceName !== "string" ||
            deviceName.trim().length === 0 ||
            deviceName.trim().length > 80) {
            res.status(400).json({
                success: false,
                message: "Valid device name is required"
            });
            return;
        }

        if (!["ANDROID", "IOS", "UNKNOWN"].includes(platform)) {
            res.status(400).json({
                success: false,
                message: "Invalid mobile platform"
            });
            return;
        }
        deviceName = deviceName.trim();
        // Pass existing credential if phone already has an identity (re-pairing flow)
        const phone_data = await confirmPairingSession(
            typeof existingCredential === "string"
                ? { qrToken, deviceName, platform, existingCredential }
                : { qrToken, deviceName, platform }
        );
        console.log("Phone paired successfully");
        res.status(201).json({
            success: true,
            message: "Phone paired successfully",
            data: phone_data
        })
    } catch (err) {
        next(err);
    }
}

export const checkPairingStatus: RequestHandler = async (req: Request, res: Response, next) => {
    console.log("GET : /api/pairing/status/:sessionId HIT");
    try {
        const device = res.locals.device;
        const { sessionId } = req.params;
        const result = await getPairingStatus(sessionId, device.id);

        res.status(200).json({
            success: true,
            data: result
        });
    } catch (err) {
        next(err);
    }
}
