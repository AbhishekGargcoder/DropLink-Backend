import type { Request, Response } from "express";

const healthCheck = (req:Request,res:Response)=>{
    res.json({
        "success" : true,
        "message" : "Droplink server is healthy!"
    });
}
export default healthCheck;