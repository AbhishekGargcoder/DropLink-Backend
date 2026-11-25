// delete all data of the databse and set it to null

import prisma from "./config/prisma.js";

const resetDatabase = async () => {
    try {
        await prisma.$transaction([ 

            prisma.deviceRecoverySession.deleteMany(),
            prisma.devicePairing.deleteMany(),
            prisma.pairingSession.deleteMany(),
            prisma.sharedText.deleteMany(),
            prisma.device.deleteMany(),
        ]); 
        console.log("Database reset successfully.");
    } catch (error) {
        console.error("Error resetting database:", error);
    }   
};

resetDatabase()
    .then(() => {
        console.log("Database reset completed.");
        process.exit(0);
    })
    .catch((error) => {
        console.error("Error during database reset:", error);
        process.exit(1);
    });