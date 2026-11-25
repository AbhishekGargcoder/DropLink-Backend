import express from "express"
import { authenticateDevice } from "../middleware/auth.middleware.js";
import { createShare,listSharedTexts, markAsRead } from "../controllers/share.controller.js";
const shareRouter = express.Router();

shareRouter.post("/text",authenticateDevice,createShare);
shareRouter.get("/",authenticateDevice,listSharedTexts);
shareRouter.patch("/:shareId/read",authenticateDevice,markAsRead);

export default shareRouter;