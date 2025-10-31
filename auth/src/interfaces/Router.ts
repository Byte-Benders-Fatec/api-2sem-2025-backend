/* eslint-disable no-unused-vars */

import { Router } from "express";

interface IRouter {
  path: string;
  getRouter(): Router;
};

export default IRouter;