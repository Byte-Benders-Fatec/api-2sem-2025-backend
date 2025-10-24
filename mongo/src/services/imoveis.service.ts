import { Filter, WithId, Document } from "mongodb";
import { getCollection } from "../configs/db.js";
import { ImovelInput } from "../schemas/imovel.schema.js";
import { flatten } from "../utils/flatten.js";

const COLLECTION = process.env.MONGODB_COLLECTION_IMOVEIS || "imoveis_rurais";

export type ImovelDoc = WithId<Document>;

export async function listImoveis(opts: {
  page: number; limit: number; skip: number;
  municipio?: string; ind_status?: string; cod_imovel?: string;
}) {
  const col = getCollection(COLLECTION);

  const filter: Filter<Document> = {};
  if (opts.municipio) filter["properties.municipio"] = opts.municipio;
  if (opts.ind_status) filter["properties.ind_status"] = opts.ind_status;
  if (opts.cod_imovel) filter["properties.cod_imovel"] = opts.cod_imovel;

  const cursor = col.find(filter, {
    projection: { __v: 0 }, // se existir
    skip: opts.skip,
    limit: opts.limit
  });

  const [items, total] = await Promise.all([cursor.toArray(), col.countDocuments(filter)]);
  return {
    page: opts.page,
    pageSize: opts.limit,
    total,
    totalPages: Math.ceil(total / opts.limit),
    items
  };
}

export async function getImovelById(id: string) {
  const col = getCollection(COLLECTION);
  return col.findOne({ _id: new (await import("mongodb")).ObjectId(id) });
}

export async function createImovel(payload: ImovelInput) {
  const col = getCollection(COLLECTION);
  const result = await col.insertOne(payload as any);
  return col.findOne({ _id: result.insertedId });
}

export async function updateImovel(id: string, payload: Partial<ImovelInput>) {
  const col = getCollection(COLLECTION);
  const { ObjectId } = await import("mongodb");

  const setOps = flatten(payload);

  await col.updateOne({ _id: new ObjectId(id) }, { $set: setOps });
  return col.findOne({ _id: new ObjectId(id) });
}

export async function deleteImovel(id: string) {
  const col = getCollection(COLLECTION);
  const { ObjectId } = await import("mongodb");
  const res = await col.deleteOne({ _id: new ObjectId(id) });
  return res.deletedCount === 1;
}

export async function listImoveisNear(opts: {
  lat: number;
  lng: number;
  limit?: number;        // ex: 200
  page?: number;         // paginação opcional (começando em 1)
  maxDistanceMeters?: number; // ex: 5000 (5 km) - opcional
  municipio?: string;    // filtros extras (iguais aos seus atuais)
  ind_status?: string;
  cod_imovel?: string;
  // campos extras para reduzir payload
  projection?: Record<string, 0 | 1>;
}) {
  const col = getCollection(COLLECTION);
  const limit = Math.max(1, Math.min(opts.limit ?? 200, 1000));
  const page  = Math.max(1, opts.page ?? 1);
  const skip  = (page - 1) * limit;

  const baseQuery: Document = {};
  if (opts.municipio) baseQuery["properties.municipio"] = opts.municipio;
  if (opts.ind_status) baseQuery["properties.ind_status"] = opts.ind_status;
  if (opts.cod_imovel) baseQuery["properties.cod_imovel"] = opts.cod_imovel;

  const pipeline: Document[] = [
    {
      $geoNear: {
        near: { type: "Point", coordinates: [opts.lng, opts.lat] },
        distanceField: "dist.meters",
        spherical: true,
        ...(opts.maxDistanceMeters ? { maxDistance: opts.maxDistanceMeters } : {}),
        query: baseQuery,        // filtros adicionais
        includeLocs: "dist.near",// opcional: inclui o ponto usado
        distanceMultiplier: 1    // mantém em metros
      }
    },
    ...(opts.projection ? [{ $project: { ...opts.projection } }] : []),
    { $skip: skip },
    { $limit: limit }
  ];

  const items = await col.aggregate(pipeline).toArray();

  // Para total, sem custo de reprocessar $geoNear (opcional):
  // Aproximação: se você usa maxDistanceMeters, pode estimar total = items.length para paginação "infinita".
  // Se precisar mesmo do total exato dentro do raio, execute um COUNT com $geoWithin:$centerSphere (ver seção 3).

  return {
    page,
    pageSize: limit,
    total: undefined,        // evitar COUNT pesado; ou calcule via $geoWithin (abaixo)
    items
  };
}

export async function listImoveisInViewport(opts: {
  sw: { lat: number; lng: number };
  ne: { lat: number; lng: number };
  limit?: number;
  page?: number;
  municipio?: string;
  ind_status?: string;
  cod_imovel?: string;
  projection?: Record<string, 0 | 1>;
  // intersect vs dentro
  mode?: "intersects" | "within"; // default: "intersects"
}) {
  const col = getCollection(COLLECTION);
  const limit = Math.max(1, Math.min(opts.limit ?? 200, 1000));
  const page  = Math.max(1, opts.page ?? 1);
  const skip  = (page - 1) * limit;

  // Polígono do viewport: SW->SE->NE->NW->SW
  const { sw, ne } = opts;
  const viewportPoly = {
    type: "Polygon",
    coordinates: [[
      [sw.lng, sw.lat],
      [ne.lng, sw.lat],
      [ne.lng, ne.lat],
      [sw.lng, ne.lat],
      [sw.lng, sw.lat]
    ]]
  };

  const base: Document = {};
  if (opts.municipio) base["properties.municipio"] = opts.municipio;
  if (opts.ind_status) base["properties.ind_status"] = opts.ind_status;
  if (opts.cod_imovel) base["properties.cod_imovel"] = opts.cod_imovel;

  // Para polígonos de imóveis, prefira $geoIntersects (pega imóveis que cruzam a viewport)
  const geoMatch = (opts.mode ?? "intersects") === "within"
    ? { geometry: { $geoWithin: { $geometry: viewportPoly } } }
    : { geometry: { $geoIntersects: { $geometry: viewportPoly } } };

  const filter = { ...base, ...geoMatch };

  const [items, total] = await Promise.all([
    col.find(filter, { skip, limit, projection: opts.projection }).toArray(),
    col.countDocuments(filter)
  ]);

  return {
    page,
    pageSize: limit,
    total,
    totalPages: Math.ceil(total / limit),
    items
  };
}
