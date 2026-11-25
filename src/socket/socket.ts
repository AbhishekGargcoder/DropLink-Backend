import { Server as SocketServer} from "socket.io";
import { createHash } from "node:crypto";
import prisma from "../config/prisma.js";

let ioInstance : SocketServer | null = null;

export const getIoInstance = () => {
    if (!ioInstance) {
        throw new Error("Socket.IO has not been initialized");
    }
    return ioInstance;
};
// upgrade the HTTP server to a WebSocket server and set up Socket.IO
export const initializeSocket = (httpServer: any) => {
    const io = new SocketServer(httpServer, {
        cors: {
            origin: [
                "https://drop-link-frontend-imcoder22-1902s-projects.vercel.app",
                "http://localhost:5173"  ,
                "http://192.168.29.240:5173"              
            ],
            credentials: true,
            methods: ["GET", "POST"]
        }
    });
    ioInstance = io;
    // app.use(callback) middleware : Authenticate every connecting device.
    io.use(async (socket, next) => {
        try {
            const credential = socket.handshake.auth?.credential;
            console.log("credential ",credential);
            if (
                typeof credential !== "string" ||
                credential.length === 0
            ) {
                return next(new Error("Device credential required"));
            }
            const credentialHash = createHash("sha256")
                .update(credential)
                .digest("hex");
            console.log("credential hased : ", credentialHash);
            const device = await prisma.device.findUnique({
                where: {
                    credentialHash
                },
                select: {
                    id: true,
                    deviceName: true,
                    deviceType: true
                }
            });
            if (!device) {
                console.log("Invalid device credential");
                return next(new Error("Invalid device credential"));
            }
            // Attach authenticated device information.
            socket.data.device = device;  // res.locals.device = device in express
            next();
        } catch (error) {
            next(new Error("Socket authentication failed"));
        }
    });
    // Connection event handler
    // Runs after successful authentication.
    io.on("connection", (socket) => {
        const device = socket.data.device;
        // CREATE a room for each device using its unique ID
        socket.join(`device:${device.id}`); 
        console.log(
            `${device.deviceName} connected through Socket.IO`
        );
        socket.on("disconnect", (reason) => {
            console.log(
                `${device.deviceName} disconnected: ${reason}`
            );
        });
    });
    return io;
};