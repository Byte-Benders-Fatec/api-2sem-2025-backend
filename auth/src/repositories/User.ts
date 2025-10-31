import roles from "../domain/User";
import { IUserRepository } from "../interfaces/User";
import User from "../models/User";
import { DeleteResult, In, Repository } from "typeorm";

class UserRepository implements IUserRepository {
    userRepository: Repository<User>;

    constructor(userRepository: Repository<User>) {
        this.userRepository = userRepository;
    };

    async add(user: User): Promise<User> {
        user = await this.userRepository.save(user);
    
        return user;
    };
    
    async getMany(skip: number, take: number, _page: number): Promise<[User[], number]> {
        const [users, total] = await this.userRepository.findAndCount({
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
            },
            skip,
            take
        });
        
        return [users, total];
    };

    async getByCpf(cpf: string): Promise<User> {
        const user = await this.userRepository.findOneBy({cpf});
    
        return user;
    };

    async getByEmail(email: string): Promise<User> {
        const user = await this.userRepository.findOneBy({email});
    
        return user;
    };
    
    async getByLogin(login: User): Promise<User> {
        const user = await this.userRepository.findOneBy({
            email: login.email,
        });
    
        return user;
    };

    async getById(id: number): Promise<User> {
        const user = await this.userRepository.findOneBy({
            id
        });
    
        return user;
    };

    async getByRoles(roles: string[]): Promise<User[]> {
        const users = await this.userRepository.find({
            where: {
                role: In(roles),
            },
        });
    
        return users;
    };

    async getRoles(): Promise<string[]> {
        return roles;
    };

    async updateById(newUserData: User): Promise<User> {
        const updatedUser = await this.userRepository.save(newUserData);

        return updatedUser;
    };

    async deleteById(id: number): Promise<DeleteResult> {
        const deletedRow = await this.userRepository.delete({
            id
        });

        return deletedRow;
    };
};

export default UserRepository;