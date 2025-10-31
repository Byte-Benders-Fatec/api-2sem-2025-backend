import { validate } from "class-validator";
import { plainToInstance } from "class-transformer";

class ValidationsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationsError";
  }
}

const validateObject = async(cls: any, entity: object): Promise<void> => {
  const buffer = [];
  const errors = await validate(plainToInstance(cls, entity));

  if (errors.length > 0) {
    errors.forEach((err) => buffer.push(Object.values(err.constraints).join(", ")));
    throw new ValidationsError(buffer.join("; "));
  }
};

export const validationsUtils = {
  validateObject
};