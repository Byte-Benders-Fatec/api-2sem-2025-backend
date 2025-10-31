import { Router } from "express";
import { IUserController } from "../interfaces/User";

class UserMeRouter {
  path: string = "/me";
  userController: IUserController;

  constructor(userController: IUserController) {
    this.userController = userController;
  }

  getRouter(): Router {
    const router: Router = Router();

    router
      .route(`${this.path}`)
      .get(this.userController.getMe)
      .put(this.userController.updateMe)

    return router;
    
  }
}

export default UserMeRouter;