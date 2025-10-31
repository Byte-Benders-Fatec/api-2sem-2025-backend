import AuthController from "../../controllers/Auth";
import User from "../../models/User";
import UserRepository from "../../repositories/User";
import AuthRouter from "../../routes/Auth";
import AuthService from "../../services/Auth";
import ormconfig from "../../ormconfig";
import UserService from "../../services/User";


const userRepository = new UserRepository(ormconfig.getRepository(User));
const userService = new UserService(userRepository);

const authService = new AuthService(userRepository);
const authController = new AuthController(authService, userService);
const authRouter = new AuthRouter(authController);

export default authRouter.getRouter();