import { getCollection } from "../configs/db.js";
import crypto from "crypto";
import { getApiKeyFromCache, invalidateApiKey } from "./apiKeyCache.service.js";
import { ApiKey, ApiKeyDoc, ApiKeyCreateInput, Role } from "../schemas/apiKey.schema.js";

const COLLECTION = "api_keys";

// util
function randomHex(bytes = 24) { 
  return crypto.randomBytes(bytes).toString("hex");
}

function hashSecret(secret: string, saltHex?: string) {
  const salt = saltHex ? Buffer.from(saltHex, "hex") : crypto.randomBytes(16);
  const hash = crypto.scryptSync(secret, salt, 32);
  return { salt: salt.toString("hex"), hash: hash.toString("hex") };
}

function verifySecret(secret: string, saltHex: string, hashHex: string) {
  const salt = Buffer.from(saltHex, "hex");
  const calc = crypto.scryptSync(secret, salt, 32);
  return crypto.timingSafeEqual(calc, Buffer.from(hashHex, "hex"));
}

function scrypt(secret: string, saltHex: string) {
  const salt = Buffer.from(saltHex, "hex");
  return crypto.scryptSync(secret, salt, 32);
}

export async function createApiKey(input: ApiKeyCreateInput) {
  const col = getCollection<ApiKey>(COLLECTION);
  const keyId = randomHex(8);      // público
  const secret = randomHex(24);    // privado
  const { hash, salt } = hashSecret(secret);

  await col.insertOne({
    keyId,
    name: input.name,
    role: input.role,
    scopes: input.scopes ?? [],
    status: "active",
    hash, 
    salt,
    createdAt: new Date(),
    expiresAt: input.expiresAt
  });

  // O cliente guarda "keyId.secret"
  return { apiKey: `${keyId}.${secret}`, keyId, role: input.role };
}

export async function verifyApiKeyHeader(headerValue: string) {
  const [keyId, secret] = (headerValue || "").split(".");
  if (!keyId || !secret) return null;

  // 1) tenta do cache
  const doc = await getApiKeyFromCache(keyId);
  if (!doc || doc.status !== "active") return null;
  if (doc.expiresAt && new Date() > new Date(doc.expiresAt)) return null;

  // 2) verifica segredo (server-side, ok ter hash/salt em cache)
  const calc = scrypt(secret, doc.salt);
  const given = Buffer.from(doc.hash, "hex");
  if (!crypto.timingSafeEqual(calc, given)) return null;

  // 3) side effect leve (não precisa invalidar cache)
  const col = getCollection<ApiKeyDoc>(COLLECTION);
  col.updateOne({ keyId }, { $set: { lastUsedAt: new Date() } }).catch(() => {});

  return { keyId: doc.keyId, role: doc.role as Role, scopes: doc.scopes };
}
