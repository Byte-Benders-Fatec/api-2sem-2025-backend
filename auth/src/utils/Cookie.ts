import { Request, Response } from "express";

const getCookie = (req: Request, cookieName: string): string => {
    return req.cookies[cookieName];
};

const setCookie = (res: Response, cookieName: string, cookieValue: string): void => {
    res.cookie(cookieName, cookieValue, {
        httpOnly: true
    });
};

const removeCookie = (res: Response, cookieName: string): void => {
    res.clearCookie(cookieName);
};

export const cookieUtils = {
    getCookie,
    setCookie,
    removeCookie
};