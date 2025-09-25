import { Router } from "express";
import { IUserController } from "../interfaces/User";

class UserRouter {
  path: string = "/users";
  userController: IUserController;

  constructor(userController: IUserController) {
    this.userController = userController;
  }

  getRouter(): Router {
    const router: Router = Router();

    router
      .route(`${this.path}`)
      .post(this.userController.add)
    
    router
      .route(`${this.path}/roles`)
      .get(this.userController.getRoles);

    router
      .route(`${this.path}/:id`)
      .get(this.userController.getById)
      .put(this.userController.updateById)
      .delete(this.userController.deleteById)
    
    router
      .route(`${this.path}/:roles`)
      .get(this.userController.getByRoles)
    
    router
      .route(`${this.path}/:take?/:page?`)
      .get(this.userController.getMany);

    return router;
    
  }
}

export default UserRouter;