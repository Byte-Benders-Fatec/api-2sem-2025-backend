import { getCollection } from "../configs/db.js";
import { ApiKeyDoc } from "../schemas/apiKey.schema.js";

const TTL_MS = Number(process.env.API_KEY_CACHE_TTL_MS ?? 10 * 60 * 1000); // default: 10 min
const NEGATIVE_TTL_MS = Number(process.env.API_KEY_NEG_TTL_MS ?? 30 * 1000); // cache de "não achou": 30s

type CacheHit = { doc: ApiKeyDoc; expiresAt: number };
const cache = new Map<string, CacheHit>();
const negativeCache = new Map<string, number>(); // keyId -> expiresAt (para misses)

function now() { return Date.now(); }
function isExpired(ts: number) { return ts <= now(); }

export function invalidateApiKey(keyId: string) {
  cache.delete(keyId);
  negativeCache.delete(keyId);
}

/** Limpa itens expirados eventualmente */
export function pruneApiKeyCache() {
  const t = now();
  for (const [k, v] of cache) if (isExpired(v.expiresAt)) cache.delete(k);
  for (const [k, exp] of negativeCache) if (isExpired(exp)) negativeCache.delete(k);
}

/** Busca doc no cache (com fallback ao Mongo) */
export async function getApiKeyFromCache(keyId: string): Promise<ApiKeyDoc | null> {
  if (!keyId) return null;

  // negative cache (evita martelar o DB em key inválida)
  const neg = negativeCache.get(keyId);
  if (neg && !isExpired(neg)) return null;
  if (neg && isExpired(neg)) negativeCache.delete(keyId);

  // cache positivo
  const hit = cache.get(keyId);
  if (hit && !isExpired(hit.expiresAt)) return hit.doc;
  if (hit && isExpired(hit.expiresAt)) cache.delete(keyId);

  // fallback: DB
  const col = getCollection<ApiKeyDoc>("api_keys");
  const doc = await col.findOne({ keyId });
  if (!doc) {
    negativeCache.set(keyId, now() + NEGATIVE_TTL_MS);
    return null;
  }

  cache.set(keyId, { doc, expiresAt: now() + TTL_MS });
  return doc;
}
