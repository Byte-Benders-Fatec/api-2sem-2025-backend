import { Router } from "express";
import { IAuthController } from "../interfaces/Auth";
import { IAuthRouter } from "../interfaces/Auth";

class AuthRouter implements IAuthRouter {
  path: string = "/auth";
  authController: IAuthController;

  constructor(authController: IAuthController) {
    this.authController = authController;
  }

  getRouter(): Router {
    const router: Router = Router();

    router
      .route(`${this.path}/login`)
      .post(this.authController.login);

    router
      .route(`${this.path}/login/:token`)
      .get(this.authController.loginByMagicLink);
    
    router
      .route(`${this.path}/logout`)
      .get(this.authController.logout);

    router
      .route(`${this.path}/signup`)
      .post(this.authController.signup)

    return router;
  }
}

export default AuthRouter;