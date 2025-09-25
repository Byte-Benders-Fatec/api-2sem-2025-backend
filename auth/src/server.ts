import http from "http";
import express from "express";
import middlewares from "../src/configs/express"

class Server {
  server: http.Server;

  constructor(app: express.Express) {
    this.server = http.createServer(middlewares(app));
  }

  listen(port: string | number) {
    this.server.listen(port);
    console.log("listening on port " + port);
  }
}

export default Server;