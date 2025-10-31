/* eslint-disable no-unused-vars */
import User from "../models/User";
import { NextFunction, Request, Response } from "express";
import IRouter from "./Router";
import { DeleteResult } from "typeorm";

interface IUserRepository {
  add(user: User): Promise<User>;
  getMany(skip: number, take: number, page: number): Promise<[User[], Number]>;
  getByCpf(cpf: string): Promise<User>;
  getByEmail(email: string): Promise<User>;
  getByLogin(login: User): Promise<User>;
  getById(id: number): Promise<User>;
  getByRoles(roles: string[]): Promise<User[]>;
  getRoles(): Promise<string[]>;
  updateById(newUserData: User): Promise<User>;
  deleteById(id: number): Promise<DeleteResult>;
};

interface IUserService {
  userRepository: IUserRepository;

  add(user: User): Promise<User>;
  getMany(skip?: number, take?: number, page?: number): Promise<[User[], Number]>;
  getByCpf(cpf: string): Promise<User>;
  getByEmail(email: string): Promise<User>;
  getByLogin(login: User): Promise<User>;
  getById(id: number): Promise<User>;
  getByRoles(roles: string[]): Promise<User[]>;
  getRoles(): Promise<string[]>;
  updateById(user: User, newUserData: User): Promise<User>;
  deleteById(id: number): Promise<DeleteResult>;
};

interface IUserController {
  userService: IUserService;

  add(req: Request, res: Response, next: NextFunction): Promise<void | Response>;
  getMany(req: Request, res: Response, next: NextFunction): Promise<void | Response>;
  getByEmail(req: Request, res: Response, next: NextFunction): Promise<void | Response>;
  getByLogin(login: User): Promise<User>;
  getById(req: Request, res: Response, next: NextFunction): Promise<void | Response>;
  getByRoles(req: Request, res: Response, next: NextFunction): Promise<void | Response>;
  getRoles(req: Request, res: Response, next: NextFunction): Promise<void | Response>;
  updateById(req: Request, res: Response, next: NextFunction): Promise<void | Response>;
  deleteById(req: Request, res: Response, next: NextFunction): Promise<void | Response>;
  
  getMe(req: Request, res: Response, next: NextFunction): Promise<void | Response>;
  updateMe(req: Request, res: Response, next: NextFunction): Promise<void | Response>;
};

interface IUserRouter extends IRouter {
  userController: IUserController;
}

export {
  IUserRepository,
  IUserService,
  IUserController,
  IUserRouter
};