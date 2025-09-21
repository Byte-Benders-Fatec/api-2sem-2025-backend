import { z } from "zod";

/** Converte string ISO → Date */
export const isoDateToDate = z
  .string()
  .datetime()
  .transform((s) => new Date(s));

/** Valida CPF (somente regex) */
export const cpfSchema = z
  .string()
  .regex(/^\d{3}\.\d{3}\.\d{3}-\d{2}$/, "Invalid CPF format");
