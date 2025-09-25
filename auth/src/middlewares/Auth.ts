import { NextFunction, Request, Response } from "express";
import jwt from 'jsonwebtoken';
import { cookieUtils } from "../utils/Cookie";

const middlewareAuth = (req: Request, res: Response, next: NextFunction): void => {
    try {
        if(process.env.SKIP_AUTH === "true") {
            return next();
        };
        
        const token = cookieUtils.getCookie(req, process.env.COOKIE_NAME);
        const user = jwt.verify(token, process.env.SECRET_KEY);
        res.locals.profile = user;
        return next();
    } catch (error) {
        return next(error);
    }
    
};

export default middlewareAuth;