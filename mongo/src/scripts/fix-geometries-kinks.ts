import { MongoClient, ObjectId } from "mongodb";
import cleanCoords from "@turf/clean-coords";
import rewind from "@turf/rewind";
import kinks from "@turf/kinks";
import unkinkPolygon from "@turf/unkink-polygon";
import { polygon, multiPolygon } from "@turf/helpers";
import "dotenv/config";

const MONGODB_URI = process.env.MONGODB_URI!;
const DB_NAME = process.env.MONGODB_DB || "app";
const COLLECTION = process.env.MONGODB_COLLECTION_IMOVEIS || "imoveis_rurais";

// >>> seu _id problemático
const TARGET_ID = new ObjectId("68ca4423977876878039a48d");

// >>> ligue só para este caso: força MultiPolygon mesmo sem kinks
const FORCE_UNKINK = true;

function ensureClosedRing(coords: number[][]): number[][] {
  if (coords.length >= 3) {
    const [a0, b0] = coords[0];
    const [aL, bL] = coords[coords.length - 1];
    if (a0 !== aL || b0 !== bL) coords = coords.concat([[a0, b0]]);
  }
  return coords;
}

(async () => {
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const col = client.db(DB_NAME).collection(COLLECTION);

  const doc = await col.findOne({ _id: TARGET_ID });
  if (!doc) throw new Error("Documento não encontrado");

  if (!doc.geometry || doc.geometry.type !== "Polygon") {
    console.log("Geometry não é Polygon. Abort.");
    process.exit(0);
  }

  // 1) fecha anel + remove duplicados adjacentes + valida ranges
  let outer: number[][] = (doc.geometry.coordinates?.[0] || [])
    .filter((p: any) => Array.isArray(p) && p.length >= 2)
    .map(([lng, lat]: any) => [Number(lng), Number(lat)])
    .filter(
      ([lng, lat]) =>
        Number.isFinite(lng) &&
        Number.isFinite(lat) &&
        lng >= -180 &&
        lng <= 180 &&
        lat >= -90 &&
        lat <= 90
    );

  const dedup: number[][] = [];
  for (const p of outer) {
    const last = dedup[dedup.length - 1];
    if (!last || last[0] !== p[0] || last[1] !== p[1]) dedup.push(p);
  }
  outer = ensureClosedRing(dedup);

  // 2) clean & rewind (exterior CCW/right-hand rule)
  const polyFeat = polygon([outer]);
  const cleaned = cleanCoords(polyFeat);
  const rew = rewind(cleaned, { reverse: false });

  // 3) detectar kinks
  const k = kinks(rew);

  if (k.features.length > 0 || FORCE_UNKINK) {
    if (k.features.length > 0) {
      console.log(`Encontrados ${k.features.length} kinks → convertendo para MultiPolygon...`);
    } else {
      console.log(`Sem kinks detectados, mas FORCE_UNKINK está ativo → convertendo para MultiPolygon...`);
    }

    const unk = unkinkPolygon(rew);

    // Normaliza TODAS as partes para MultiPolygon GeoJSON
    const parts = unk.features.map((f) =>
      f.geometry.type === "Polygon"
        ? (f.geometry as GeoJSON.Polygon).coordinates
        : (f.geometry as GeoJSON.MultiPolygon).coordinates[0]
    );

    const merged = multiPolygon(parts);

    await col.updateOne(
      { _id: doc._id },
      {
        $set: {
          geometry: merged.geometry,
          "properties.geom_status": k.features.length > 0
            ? "FIXED_UNKINKED_TO_MULTIPOLYGON"
            : "FIXED_FORCE_UNKINKED"
        }
      }
    );
    console.log("Atualizado para MultiPolygon com sucesso.");
  } else {
    // sem kinks e sem FORÇAR → grava versão limpa/rewind
    await col.updateOne(
      { _id: doc._id },
      {
        $set: {
          geometry: rew.geometry,
          "properties.geom_status": "FIXED_CLEANED_REWIND"
        }
      }
    );
    console.log("Atualizado Polygon (clean/rewind).");
  }

  await client.close();
  console.log("Done.");
})();
