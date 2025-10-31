import { MongoClient, AnyBulkWriteOperation } from "mongodb";
import "dotenv/config";

type Ring = number[][];
type Polygon = Ring[];
type MultiPolygon = Polygon[];

const MONGODB_URI = process.env.MONGODB_URI!;
const DB_NAME = process.env.MONGODB_DB || "app";
const COLLECTION = process.env.MONGODB_COLLECTION_IMOVEIS || "imoveis_rurais";

// ===== Configuráveis =====
// const DRY_RUN = process.env.DRY_RUN === "true";     // "true" para simular
const DRY_RUN = false;     // "true" para simular
const BATCH_BULK = Number(process.env.BATCH_BULK || 500);
const BATCH_CURSOR = Number(process.env.BATCH_CURSOR || 500);
const LOG_EVERY = Number(process.env.LOG_EVERY || 1000); // log a cada N docs
const ONLY_WHEN_NEEDED = process.env.ONLY_WHEN_NEEDED !== "false"; // evita update se não mudou
const MARK_INVALID = process.env.MARK_INVALID !== "false"; // marca inválidos

// Filtro padrão: todos que têm geometria Polygon ou MultiPolygon
const BASE_QUERY = {
  "geometry.type": { $in: ["Polygon", "MultiPolygon"] },
  "geometry.coordinates": { $type: "array" }
};

function closeRingIfNeeded(ring: Ring): Ring {
  if (ring.length < 3) return ring;
  const [lng0, lat0] = ring[0];
  const [lngL, latL] = ring[ring.length - 1];
  if (lng0 !== lngL || lat0 !== latL) ring.push([lng0, lat0]);
  return ring;
}

function cleanRing(ringIn: any): Ring {
  const out: Ring = [];
  if (!Array.isArray(ringIn)) return out;

  for (const pos of ringIn) {
    if (!Array.isArray(pos) || pos.length < 2) continue;
    const lng = Number(pos[0]); const lat = Number(pos[1]);
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) continue;
    if (lng < -180 || lng > 180 || lat < -90 || lat > 90) continue;

    const last = out[out.length - 1];
    if (!last || last[0] !== lng || last[1] !== lat) out.push([lng, lat]);
  }
  if (out.length >= 3) closeRingIfNeeded(out);
  return out;
}

function cleanPolygon(coords: any): Polygon {
  if (!Array.isArray(coords)) return [];
  const rings: Polygon = coords.map(cleanRing).filter(r => r.length >= 4);
  return rings;
}

function cleanMultiPolygon(coords: any): MultiPolygon {
  if (!Array.isArray(coords)) return [];
  const polys: MultiPolygon = coords.map((poly: any) => {
    const rings = cleanPolygon(poly);
    return rings;
  }).filter((rings: Polygon) => rings.length > 0);
  return polys;
}

function deepEqual(a: any, b: any) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function fmt(n: number) {
  return n.toLocaleString("pt-BR");
}

function etaString(start: number, processed: number, total: number) {
  if (processed === 0) return "ETA --:--";
  const elapsed = (Date.now() - start) / 1000; // s
  const rate = processed / elapsed;            // docs/s
  const remain = (total - processed) / rate;   // s
  const m = Math.floor(remain / 60);
  const s = Math.round(remain % 60);
  return `ETA ${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

async function main() {
  if (!MONGODB_URI) throw new Error("Defina MONGODB_URI");

  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const col = client.db(DB_NAME).collection(COLLECTION);

  // Total para barra de progresso: prefira countDocuments(BASE_QUERY) (exato)
  const total = await col.countDocuments(BASE_QUERY);
  console.log(`[init] Coleção: ${DB_NAME}.${COLLECTION}`);
  console.log(`[init] Filtro: ${JSON.stringify(BASE_QUERY)}`);
  console.log(`[init] Total a varrer: ${fmt(total)} documentos`);
  if (DRY_RUN) console.log(`[init] DRY_RUN = true (nenhuma escrita será feita)`);

  const start = Date.now();
  let processed = 0;
  let modified = 0;
  let unchanged = 0;
  let invalid = 0;
  let errors = 0;

  const bulkOps: AnyBulkWriteOperation[] = [];

  const cursor = col.find(BASE_QUERY, {
    batchSize: BATCH_CURSOR,
    projection: { geometry: 1, properties: 1 }
  });

  while (await cursor.hasNext()) {
    const doc = await cursor.next();
    processed++;

    try {
      const geom = doc?.geometry;
      if (!geom?.type || !Array.isArray(geom?.coordinates)) {
        // Geometria ausente/ruim — opcionalmente marcar
        if (MARK_INVALID && !DRY_RUN) {
          bulkOps.push({
            updateOne: {
              filter: { _id: doc._id },
              update: { $set: { "properties.geom_status": "INVALID_MISSING" } }
            }
          });
        }
        invalid++;
      } else if (geom.type === "Polygon") {
        const fixed = cleanPolygon(geom.coordinates);
        if (fixed.length === 0) {
          if (MARK_INVALID && !DRY_RUN) {
            bulkOps.push({
              updateOne: {
                filter: { _id: doc._id },
                update: { $set: { "properties.geom_status": "INVALID_POLYGON" } }
              }
            });
          }
          invalid++;
        } else if (!ONLY_WHEN_NEEDED || !deepEqual(fixed, geom.coordinates)) {
          modified++;
          if (!DRY_RUN) {
            bulkOps.push({
              updateOne: {
                filter: { _id: doc._id },
                update: {
                  $set: {
                    geometry: { type: "Polygon", coordinates: fixed },
                    "properties.geom_status": "FIXED"
                  }
                }
              }
            });
          }
        } else {
          unchanged++;
        }
      } else if (geom.type === "MultiPolygon") {
        const fixed = cleanMultiPolygon(geom.coordinates);
        if (fixed.length === 0) {
          if (MARK_INVALID && !DRY_RUN) {
            bulkOps.push({
              updateOne: {
                filter: { _id: doc._id },
                update: { $set: { "properties.geom_status": "INVALID_MULTIPOLYGON" } }
              }
            });
          }
          invalid++;
        } else if (!ONLY_WHEN_NEEDED || !deepEqual(fixed, geom.coordinates)) {
          modified++;
          if (!DRY_RUN) {
            bulkOps.push({
              updateOne: {
                filter: { _id: doc._id },
                update: {
                  $set: {
                    geometry: { type: "MultiPolygon", coordinates: fixed },
                    "properties.geom_status": "FIXED"
                  }
                }
              }
            });
          }
        } else {
          unchanged++;
        }
      } else {
        // Tipos não tratados aqui
        unchanged++;
      }
    } catch (e) {
      errors++;
      if (MARK_INVALID && !DRY_RUN) {
        bulkOps.push({
          updateOne: {
            filter: { _id: (doc as any)._id },
            update: { $set: { "properties.geom_status": "ERROR" } }
          }
        });
      }
    }

    // executa bulk periodicamente
    if (bulkOps.length >= BATCH_BULK) {
      if (!DRY_RUN) await col.bulkWrite(bulkOps, { ordered: false });
      bulkOps.length = 0;
    }

    // logs periódicos
    if (processed % LOG_EVERY === 0 || processed === total) {
      const pct = ((processed / total) * 100).toFixed(1);
      console.log(
        `[progress] ${fmt(processed)}/${fmt(total)} (${pct}%)  ` +
        `mod:${fmt(modified)}  ok:${fmt(unchanged)}  inv:${fmt(invalid)}  err:${fmt(errors)}  ` +
        etaString(start, processed, total)
      );
    }
  }

  // flush final
  if (bulkOps.length) {
    if (!DRY_RUN) await col.bulkWrite(bulkOps, { ordered: false });
  }

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log("\n[done]");
  console.log(` processados: ${fmt(processed)}  (em ${elapsed}s)`);
  console.log(` modificados: ${fmt(modified)}`);
  console.log(` inalterados: ${fmt(unchanged)}`);
  console.log(` inválidos:   ${fmt(invalid)}${MARK_INVALID ? " (marcados em properties.geom_status)" : ""}`);
  console.log(` erros:       ${fmt(errors)}`);

  await client.close();
}

main().catch(err => {
  console.error("[fatal]", err);
  process.exit(1);
});
