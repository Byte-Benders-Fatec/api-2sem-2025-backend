import UserController from "../../controllers/User";
import User from "../../models/User";
import ormconfig from "../../ormconfig";
import UserRepository from "../../repositories/User";
import UserRouter from "../../routes/User";
import UserService from "../../services/User";

const userRepository = new UserRepository(ormconfig.getRepository(User));
const userService = new UserService(userRepository);
const userController = new UserController(userService);
const userRouter = new UserRouter(userController);

export default userRouter.getRouter();