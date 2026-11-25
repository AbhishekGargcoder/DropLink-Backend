import type { Request, Response, RequestHandler } from "express";
import { registerDevice, getPairedDevices, unpairDevice, renameDevice } from "../services/device.service.js";

const allowedPlatforms = ["WINDOWS", "ANDROID", "IOS", "MACOS", "LINUX", "UNKNOWN"];

export const registerDesktop: RequestHandler = async (req: Request, res: Response, next) => {
    try {
        const { deviceName, platform } = req.body ?? {};
        if (
            typeof deviceName !== "string" ||
            deviceName.trim().length === 0 ||
            deviceName.length > 80
        ) {
            res.status(400).json({
                success: false,
                message: "Valid device name is required"
            });
            return;
        }
        if (!allowedPlatforms.includes(platform)) {
            res.status(400).json({
                success: false,
                message: "Invalid device platform"
            });
            return;
        }
        const result = await registerDevice({
            deviceName: deviceName.trim(),
            deviceType: "DESKTOP",     // register desktop only here
            platform
        });
        res.status(201).json({
            success: true,
            message: "Desktop registered successfully",
            data: result
        });
    } catch (error) {
        next(error);
    }
}

export const getCurrentDevice: RequestHandler = (req, res) => {
    const device = res.locals.device;

    res.status(200).json({
        success: true,
        message: "Device authenticated successfully",
        data: device
    });
};

export const renameCurrentDevice: RequestHandler = async (req, res, next) => {
    try {
        const { deviceName } = req.body ?? {};

        if (
            typeof deviceName !== "string" ||
            deviceName.trim().length === 0 ||
            deviceName.trim().length > 80
        ) {
            res.status(400).json({
                success: false,
                message: "Device name must be between 1 and 80 characters"
            });
            return;
        }

        const device = await renameDevice(
            res.locals.device.id,
            deviceName.trim()
        );

        res.status(200).json({
            success: true,
            message: "Device name updated successfully",
            data: device
        });
    } catch (error) {
        next(error);
    }
};


export const listPairedDevices: RequestHandler = async (
    req,
    res,
    next
) => {
    try {
        const laptopDevice = res.locals.device; // laptop's ID

        const devices = await getPairedDevices(laptopDevice.id);

        res.status(200).json({
            success: true,
            count: devices.length,
            data: devices
        });
    } catch (error) {
        next(error);
    }
};

export const removePairedDevice: RequestHandler = async (
    req,
    res,
    next
) => {
    try {
        const laptopDevice = res.locals.device;
        const { deviceId } = req.params;

        const result = await unpairDevice(
            laptopDevice.id,
            req.params.deviceId
        );

        res.status(200).json({
            success: true,
            message: "Device unpaired successfully",
            data: result
        });
    } catch (error) {
        next(error);
    }
};
