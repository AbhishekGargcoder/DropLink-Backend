import type {Request,Response, ErrorRequestHandler } from "express";

export const errorHandlingMiddleware: ErrorRequestHandler  = (err,req:Request,res:Response,next)=>{
    console.log("Error handling middleware called");
    const statusCode = err.statusCode || 500;
    const message = err.message || "Internal server error";
    res.status(statusCode).json({ success: false, statusCode, message });
}