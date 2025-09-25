import { NextFunction, Request, Response } from "express";
import HttpStatus from 'http-status-codes';

const middlewareError = (error: Error, _req: Request, res: Response, _next: NextFunction): Response => {
    switch (error.name) {
        case "ValidationsError":
          return res.status(HttpStatus.BAD_REQUEST).send({ error: error.message });
        case "TokenExpiredError":
          return res.status(HttpStatus.UNAUTHORIZED).send({ error: error.message });
        case "JsonWebTokenError":
          return res.status(HttpStatus.UNAUTHORIZED).send({ error: error.message });
        default:
          return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({ error: "internal server error" });
    };
};

export default middlewareError;