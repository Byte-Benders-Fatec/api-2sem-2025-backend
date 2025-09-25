import UserController from "../../controllers/User";
import User from "../../models/User";
import ormconfig from "../../ormconfig";
import UserRepository from "../../repositories/User";
import UserMeRouter from "../../routes/UserMe";
import UserService from "../../services/User";

const userRepository = new UserRepository(ormconfig.getRepository(User));
const userService = new UserService(userRepository);
const userController = new UserController(userService);
const userMeRouter = new UserMeRouter(userController);

export default userMeRouter.getRouter();