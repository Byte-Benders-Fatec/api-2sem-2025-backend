import { MongoClient, AnyBulkWriteOperation } from "mongodb";
import "dotenv/config";

/**
 * Estratégia:
 * 1) Cria uma coleção temporária TMP com índice 2dsphere em geometry.
 * 2) Para cada doc da coleção origem (filtro Polygon/MultiPolygon), tenta inserir na TMP:
 *    - Se inserir OK: remove da TMP e segue (doc é saudável).
 *    - Se der erro "Can't extract geo keys": move doc para BAD e remove da origem (quarentena).
 * 3) Ao final, tenta criar índice 2dsphere na coleção origem (deve passar).
 */

// ====== CONFIG ======
const MONGODB_URI = process.env.MONGODB_URI!;
const DB_NAME = process.env.MONGODB_DB || "app";
const SRC_COLLECTION = process.env.MONGODB_COLLECTION_IMOVEIS || "imoveis_rurais";
const TMP_COLLECTION = process.env.MONGODB_TMP_GEO || "tmp_geo_check";
const BAD_COLLECTION = process.env.MONGODB_BAD_GEO || "bad_geoms";

const DRY_RUN = process.env.DRY_RUN === "true"; // se true, não move/remove nada
const LOG_EVERY = Number(process.env.LOG_EVERY || 500);
const BATCH_CURSOR = Number(process.env.BATCH_CURSOR || 500);

// Filtro: só docs com geometry compatível (ajuste se tiver outros tipos)
const BASE_QUERY = {
  "geometry.type": { $in: ["Polygon", "MultiPolygon"] },
  "geometry.coordinates": { $type: "array" }
};

async function ensureCollection(db: any, name: string) {
  const exists = await db.listCollections({ name }).hasNext();
  if (!exists) {
    await db.createCollection(name);
  }
  return db.collection(name);
}

function fmt(n: number) { return n.toLocaleString("pt-BR"); }

async function ensureTmpWithIndex(tmp) {
  // limpa TMP (agora existente) e garante índice 2dsphere lá
  await tmp.deleteMany({});
  const idx = await tmp.indexes();
  const has2d = idx.some((i: any) => Object.values(i.key || {}).includes("2dsphere"));
  if (!has2d) {
  await tmp.createIndex({ geometry: "2dsphere" }, { name: "geometry_2dsphere_tmp" });
  }
  return;
}

async function main() {
  if (!MONGODB_URI) throw new Error("Defina MONGODB_URI");

  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db(DB_NAME);
  const src = db.collection(SRC_COLLECTION);
  // garante TMP e BAD existem; cria se não existir
  const tmp = await ensureCollection(db, TMP_COLLECTION);
  const bad = await ensureCollection(db, BAD_COLLECTION);
  
  await ensureTmpWithIndex(tmp);
  
  const total = await src.countDocuments(BASE_QUERY);
  console.log(`[init] DB: ${DB_NAME}`);
  console.log(`[init] Source: ${SRC_COLLECTION}`);
  console.log(`[init] Temp:   ${TMP_COLLECTION} (com índice 2dsphere)`);
  console.log(`[init] Bad:    ${BAD_COLLECTION}`);
  console.log(`[init] Total candidatos: ${fmt(total)}  | DRY_RUN=${DRY_RUN}`);

  let processed = 0, quarantined = 0, healthy = 0, errors = 0;

  const cursor = src.find(BASE_QUERY, {
    batchSize: BATCH_CURSOR,
    projection: { /* traga tudo, incluindo _id e geometry */ }
  });

  while (await cursor.hasNext()) {
    const doc = await cursor.next();
    processed++;

    try {
      // 1) tenta inserir na TMP (vai falhar se geometry for inválida p/ 2dsphere)
      await tmp.insertOne(doc);
      // 2) se inseriu, remove da TMP (mantemos TMP sempre pequena)
      await tmp.deleteOne({ _id: doc._id });
      healthy++;
    } catch (e: any) {
      const msg = String(e?.message || e);
      const cantExtract = msg.includes("Can't extract geo keys");
      if (cantExtract) {
        // mover para BAD e remover da origem
        if (!DRY_RUN) {
          // evita duplicar no BAD
          await bad.updateOne({ _id: doc._id }, { $set: doc }, { upsert: true });
          await src.deleteOne({ _id: doc._id });
        }
        quarantined++;
      } else {
        // erro inesperado (rede, etc.). Apenas contabiliza.
        errors++;
        if (processed % LOG_EVERY === 0) {
          console.warn(`[warn] erro inesperado p/ _id=${doc._id}: ${msg}`);
        }
      }
    }

    if (processed % LOG_EVERY === 0 || processed === total) {
      const pct = ((processed / total) * 100).toFixed(1);
      console.log(
        `[progress] ${fmt(processed)}/${fmt(total)} (${pct}%)  ` +
        `ok:${fmt(healthy)}  quarentena:${fmt(quarantined)}  err:${fmt(errors)}`
      );
    }
  }

  // Opcional: derruba TMP para fechar o ciclo
  await db.collection(TMP_COLLECTION).deleteMany({});

  console.log("\n[done]");
  console.log(` processados:  ${fmt(processed)}`);
  console.log(` saudáveis:    ${fmt(healthy)}`);
  console.log(` quarentena:   ${fmt(quarantined)}  → movidos para ${BAD_COLLECTION}`);
  console.log(` erros:        ${fmt(errors)}`);

  // Tenta criar o índice na origem (se não for DRY_RUN)
  if (!DRY_RUN) {
    console.log("\n[index] Tentando criar índice 2dsphere na coleção de origem…");
    try {
      await src.createIndex({ geometry: "2dsphere" }, { name: "geometry_2dsphere" });
      console.log("[index] ✅ Índice criado com sucesso.");
    } catch (e: any) {
      console.error("[index] ❌ Falha ao criar índice:", e?.message || e);
      console.error("Ainda há documentos problemáticos ou o erro é de outro tipo.");
    }
  }

  await client.close();
}

main().catch(err => {
  console.error("[fatal]", err);
  process.exit(1);
});
