import express from "express";
import { createPairing , confirmPairing, checkPairingStatus} from "../controllers/pairing.controller.js";
import { authenticateDevice } from "../middleware/auth.middleware.js";

const pairingRouter = express.Router();

// Laptop: create a QR pairing session
pairingRouter.post("/create", authenticateDevice, createPairing);
                                                    
// Phone: redeem the QR token
pairingRouter.post("/confirm",confirmPairing); // a new phone so, It authenticates using the temporary QR token instead.

// Laptop polls "GET: /api/pairing/status/:sessionId" repeatedly 
pairingRouter.get("/status/:sessionId",authenticateDevice,checkPairingStatus);

export default pairingRouter;