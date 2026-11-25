import express from "express";
import {registerDesktop, getCurrentDevice, renameCurrentDevice, listPairedDevices,removePairedDevice } from "../controllers/device.controller.js";
import { createRecovery, confirmRecovery } from "../controllers/recovery.controller.js";
import { authenticateDevice } from "../middleware/auth.middleware.js";

const deviceRouter = express.Router();

deviceRouter.post("/register", registerDesktop);
deviceRouter.get("/me", authenticateDevice, getCurrentDevice);
deviceRouter.patch("/me", authenticateDevice, renameCurrentDevice);

// List all paired devices
deviceRouter.get("/", authenticateDevice, listPairedDevices);

// Unpair a device
deviceRouter.delete("/:deviceId", authenticateDevice, removePairedDevice);

export default deviceRouter;
