import Router from "express";
import { createRecovery, confirmRecovery } from "../controllers/recovery.controller.js";
import {authenticateDevice} from "../middleware/auth.middleware.js";

const recoveryRouter = Router();

//  Recovery routes
// :deviceId is the laptop's deviceId
recoveryRouter.post("/:deviceId/recovery/create", authenticateDevice, createRecovery);// Authenticated laptop
recoveryRouter.post("/recovery/confirm", confirmRecovery); //Public, protected by recovery token

export default recoveryRouter;