import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import ormconfig from "../ormconfig";
import userRouter from "../configs/routes/User"
import middlewareError from "../middlewares/Errors";
import middlewareAuth from "../middlewares/Auth";
import middlewareAdmin from "../middlewares/isAdmin";
import authRouter from './routes/Auth';
import middlewareNotFound from "../middlewares/NotFound";
import userMeRouter from './routes/UserMe';

const API = "/api/v1";
const PUBLIC = `${API}/public`;
const PRIVATE = `${API}/private`;

export default (app: express.Express): express.Express => {
  ormconfig.initialize().then(() => {

    app.use(express.json());
    app.use(express.urlencoded({ extended: false }));
    app.use(cookieParser());
    app.use(cors({ credentials: true, origin: true }));

    // public routes
    app.use(PUBLIC, authRouter)

    // enable auth middleware for private routes
    app.use(middlewareAuth);

    // private routes
    app.use(PRIVATE, userMeRouter);
    
    // enable auth middleware for admin routes
    app.use(middlewareAdmin);
    
    // admin routes
    app.use(PRIVATE, userRouter);

    // enable error handler middleware for all routes
    app.use(middlewareError);

    // enable not found handler middleware for all routes
    app.use(middlewareNotFound);

  });

  return app;
};