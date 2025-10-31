import { NextFunction, Request, Response } from "express";
import jwt from 'jsonwebtoken';
import HttpStatus from 'http-status-codes';
import { cookieUtils } from '../utils/Cookie';

const middlewareAdmin = (req: Request, res: Response, next: NextFunction): void | Response => {
    try {
        if(process.env.SKIP_AUTH === "true") {
            return next();
        };

        const token = cookieUtils.getCookie(req, process.env.COOKIE_NAME);
        const user = jwt.verify(token, process.env.SECRET_KEY);
        if(user.user["role"] !== "Admin"){
            return res.status(HttpStatus.UNAUTHORIZED).send({ error: "admin access only" }); 
        };

        return next();
    } catch (error) {
        return next(error);
    };
    
};

export default middlewareAdmin;