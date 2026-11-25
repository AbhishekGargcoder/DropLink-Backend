import express from "express";
import cors from "cors";

import healthRouter from "./routes/health.routes.js";
import pairingRouter from "./routes/pairing.routes.js";
import deviceRouter from "./routes/device.routes.js";
import shareRouter from "./routes/share.route.js";
import recoveryRouter from "./routes/recovery.routes.js";
import fileRouter from "./routes/file.routes.js";
import { errorHandlingMiddleware } from "./middleware/errorMiddleware.js";

const app = express();

app.use(cors({
    origin: 
        ["https://drop-link-frontend-m6a8ktk3r-imcoder22-1902s-projects.vercel.app",
            "http://localhost:5173",
            "http://192.168.29.240:5173"              
        ]
    ,
    credentials: true,
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json());

app.get("/", (req, res) => {
    res.send("Welcome to DropLink API");
});
app.use("/health", healthRouter);
app.use("/api/devices", deviceRouter);
app.use("/api/devices", recoveryRouter);
app.use("/api/pairing", pairingRouter);
app.use("/api/shares", shareRouter);
app.use("/api/files", fileRouter);

app.use(errorHandlingMiddleware);

export default app;