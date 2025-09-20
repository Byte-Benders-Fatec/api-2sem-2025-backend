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
