import express from "express";
import Server from "./server";
import "reflect-metadata";
import "./configs/env";

const app = express();
const server = new Server(app);
server.listen(process.env.API_PORT || 3333);