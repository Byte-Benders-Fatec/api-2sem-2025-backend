import bcrypt from "bcrypt";

const compareHashPassword = (password: string, hash: string): boolean => bcrypt.compareSync(password, hash);
const hashPassword = (password: string): string => bcrypt.hashSync(password, bcrypt.genSaltSync(12));

export const passwordUtils = {
  compareHashPassword,
  hashPassword
};