import { z } from "zod";
import { isoDateToDate } from "../utils/zod.helpers";
import { ObjectId } from "mongodb";

export const roleSchema = z.enum(["public", "user", "admin"]);
export const statusSchema = z.enum(["active", "revoked"]);

export type Role = z.infer<typeof roleSchema>;
export type Status = z.infer<typeof statusSchema>;

/** Criação: */
export const createApiKeySchema = z.object({
  name: z.string().trim().min(3),
  role: roleSchema,
  scopes: z.array(z.string()).default([]),
  expiresAt: isoDateToDate.optional() //ISO 8601 ("2025-12-31T23:59:59Z")
});
export type ApiKeyCreateInput = z.infer<typeof createApiKeySchema>;

/** Atualização: */
export const updateApiKeySchema = z.object({
  name: z.string().trim().min(3).optional(),
  role: roleSchema.optional(),
  scopes: z.array(z.string()).optional(),
  status: statusSchema.optional(),
  expiresAt: isoDateToDate.optional() //ISO 8601 ("2025-12-31T23:59:59Z")
});
export type ApiKeyUpdateInput = z.infer<typeof updateApiKeySchema>;

/** Entidade: */
export const apiKeySchema = z.object({
  keyId: z.string(),
  name: z.string(),
  role: roleSchema,
  scopes: z.array(z.string()).default([]),
  status: statusSchema.default("active"),
  hash: z.string(),
  salt: z.string(),
  createdAt: z.date(),
  lastUsedAt: z.date().optional(),
  expiresAt: z.date().optional(),
});
export type ApiKey = z.infer<typeof apiKeySchema>;

/** Documento do Mongo: */
export type ApiKeyDoc = ApiKey & { _id: ObjectId };
