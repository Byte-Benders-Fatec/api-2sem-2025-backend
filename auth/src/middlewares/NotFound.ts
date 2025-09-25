import { NextFunction, Request, Response } from "express";
import HttpStatus from 'http-status-codes';

const middlewareNotFound = (_req: Request, res: Response, _next: NextFunction): Response => {
    return res.status(HttpStatus.NOT_FOUND).send({ error: "invalid endpoint" });
};

export default middlewareNotFound;