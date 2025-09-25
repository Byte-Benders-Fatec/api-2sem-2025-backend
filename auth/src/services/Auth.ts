import { IAuthService } from "../interfaces/Auth";
import jwt from "jsonwebtoken";
import { IUserRepository } from "../interfaces/User";
import User from "../models/User";
import { passwordUtils } from "../utils/Password";

class AuthService implements IAuthService {
  userRepository: IUserRepository;

  constructor(userRepository: IUserRepository) {
    this.userRepository = userRepository;
  }

  generateToken(user: User): string {
    return jwt.sign({user}, process.env.SECRET_KEY, { expiresIn: process.env.COOKIE_EXPIRES_IN });
  }

  async getUserByLogin(login: User): Promise<User> {
    const user = await this.userRepository.getByLogin(login);
    if (user && !passwordUtils.compareHashPassword(login.password, user.password)) return null;

    return user;
  }
}

export default AuthService;
