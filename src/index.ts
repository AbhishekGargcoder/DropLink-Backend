// 1. creating the HTTP server, 
// 2. initializing Socket.IO, and 
// 3. listening on the port.
import { createServer } from "node:http";
import app from "./app.js";
import { initializeSocket } from "./socket/socket.js";
import "dotenv/config";

const PORT = Number(process.env.PORT ?? 3000);

if (!Number.isInteger(PORT) || PORT < 1 || PORT > 65535) {
    throw new Error("Invalid PORT configuration");
}

const httpServer = createServer(app);

// Attach Socket.IO to the same HTTP server.
initializeSocket(httpServer);  // Upgrade HTTP server to a WebSocket server

httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`DropLink server running on port ${PORT}`);
});