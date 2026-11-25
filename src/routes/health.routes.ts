import express from "express";
import healthCheck from "../controllers/health.controller.js";
const healthRouter = express.Router();

healthRouter.use((req,res,next)=>{
    console.log("Health middleware called");
    next();
});

healthRouter.get("/",healthCheck);

export default healthRouter;