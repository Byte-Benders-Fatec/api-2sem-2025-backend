import { Filter, WithId, Document, ObjectId } from "mongodb";
import { getCollection } from "../configs/db.js";
import { ImovelInput } from "../schemas/imovel.schema.js";
import { flatten } from "../utils/flatten.js";
import {
  calculatePolygonCentroid,
  isPointInPolygonWithTolerance
} from "../utils/geometry.js";

const COLLECTION = process.env.MONGODB_COLLECTION_IMOVEIS || "imoveis_rurais";

export type ImovelDoc = WithId<Document>;

/**
 * Normaliza CPF removendo formatação (pontos, hífens, espaços)
 * Exemplos: 
 * - "123.456.789-00" → "12345678900"
 * - "123 456 789 00" → "12345678900"
 * - "12345678900" → "12345678900"
 */
function normalizeCPF(cpf: string): string {
  return cpf.replace(/[.\-\s]/g, '');
}

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
  const page = Math.max(1, opts.page ?? 1);
  const skip = (page - 1) * limit;

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
  const page = Math.max(1, opts.page ?? 1);
  const skip = (page - 1) * limit;

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

/**
 * Gera Plus Code para um imóvel e salva direto nas properties
 * Se latitude/longitude não forem fornecidas, usa o centroide automaticamente
 * Valida se o ponto está dentro da propriedade
 * 
 * @param imovelId - ID do imóvel
 * @param latitude - Latitude do ponto de referência (opcional, usa centroide se não fornecido)
 * @param longitude - Longitude do ponto de referência (opcional, usa centroide se não fornecido)
 * @returns Imóvel atualizado com Plus Code
 */
export async function generatePlusCodeForImovel(
  imovelId: string,
  latitude?: number,
  longitude?: number
): Promise<{
  imovel: ImovelDoc | null;
  plusCode: {
    global_code: string;
    compound_code?: string;
    coordinates: { latitude: number; longitude: number };
  } | null;
  usedCentroid?: boolean;
  error?: string;
  details?: string;
}> {
  const col = getCollection(COLLECTION);

  // Verificar se o imóvel existe
  const imovel = await col.findOne({ _id: new ObjectId(imovelId) });
  if (!imovel) {
    return { imovel: null, plusCode: null };
  }

  // Verificar se o imóvel tem geometria válida
  const geometry = (imovel as any).geometry;
  if (!geometry || geometry.type !== "Polygon" || !geometry.coordinates) {
    return {
      imovel: null,
      plusCode: null,
      error: "Imóvel não possui geometria de polígono válida"
    };
  }

  let finalLat: number;
  let finalLng: number;
  let usedCentroid = false;

  // Se não forneceu lat/lng, calcular centroide
  if (latitude === undefined || longitude === undefined) {
    const centroid = calculatePolygonCentroid(geometry.coordinates);

    if (!centroid) {
      return {
        imovel: null,
        plusCode: null,
        error: "Não foi possível calcular o centro da propriedade"
      };
    }

    finalLat = centroid.latitude;
    finalLng = centroid.longitude;
    usedCentroid = true;
  } else {
    finalLat = latitude;
    finalLng = longitude;
  }

  // VALIDAÇÃO: Verificar se o ponto está dentro da propriedade
  const isInside = isPointInPolygonWithTolerance(
    geometry.coordinates,
    finalLat,
    finalLng,
    100 // 100 metros de tolerância
  );

  if (!isInside) {
    return {
      imovel: null,
      plusCode: null,
      error: "O ponto escolhido está fora dos limites da propriedade",
      details: `Coordenadas fornecidas (${finalLat}, ${finalLng}) não estão dentro do polígono do imóvel. Por favor, escolha um ponto dentro dos limites da propriedade.`
    };
  }

  // Chamar Google Geocoding API para gerar Plus Code
  const apiKey = process.env.GOOGLE_GEOCODING_API_KEY;
  if (!apiKey) {
    return {
      imovel: null,
      plusCode: null,
      error: "GOOGLE_GEOCODING_API_KEY não configurada"
    };
  }

  try {
    const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
    url.searchParams.set("latlng", `${finalLat},${finalLng}`);
    url.searchParams.set("key", apiKey);

    const response = await fetch(url.toString());
    const data: any = await response.json();

    if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
      return {
        imovel: null,
        plusCode: null,
        error: `Erro ao gerar Plus Code: ${data.status}`
      };
    }

    // Extrair Plus Code
    let plusCodeData = null;
    if (data.plus_code?.global_code) {
      plusCodeData = {
        global_code: data.plus_code.global_code,
        compound_code: data.plus_code.compound_code
      };
    } else if (data.results?.[0]?.plus_code?.global_code) {
      plusCodeData = {
        global_code: data.results[0].plus_code.global_code,
        compound_code: data.results[0].plus_code.compound_code
      };
    }

    if (!plusCodeData) {
      return {
        imovel: null,
        plusCode: null,
        error: "Não foi possível gerar Plus Code para estas coordenadas"
      };
    }

    // Atualizar imóvel com Plus Code direto nas properties
    await col.updateOne(
      { _id: new ObjectId(imovelId) },
      {
        $set: {
          "properties.plus_code": {
            global_code: plusCodeData.global_code,
            compound_code: plusCodeData.compound_code,
            coordinates: {
              latitude: finalLat,
              longitude: finalLng
            }
          }
        }
      }
    );

    const updatedImovel = await col.findOne({ _id: new ObjectId(imovelId) });

    return {
      imovel: updatedImovel,
      plusCode: {
        global_code: plusCodeData.global_code,
        compound_code: plusCodeData.compound_code,
        coordinates: {
          latitude: finalLat,
          longitude: finalLng
        }
      },
      usedCentroid
    };
  } catch (error) {
    return {
      imovel: null,
      plusCode: null,
      error: `Erro ao chamar Google API: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
    };
  }
}

/**
 * Lista todos os imóveis de um CPF específico
 * Aceita CPF formatado ou apenas números
 * 
 * @param cpf - CPF do proprietário (com ou sem formatação)
 * @param page - Página atual (default: 1)
 * @param limit - Itens por página (default: 50)
 * @returns Lista paginada de imóveis
 */
export async function listImoveisByCPF(
  cpf: string,
  page: number = 1,
  limit: number = 50
) {
  const col = getCollection(COLLECTION);

  // Normalizar CPF (remover formatação)
  const normalizedCPF = normalizeCPF(cpf);

  // Validar se CPF tem 11 dígitos
  if (normalizedCPF.length !== 11 || !/^\d{11}$/.test(normalizedCPF)) {
    throw new Error("CPF inválido. Deve conter 11 dígitos numéricos.");
  }

  // Buscar tanto pelo CPF normalizado quanto pelo formatado
  // Isso garante compatibilidade com diferentes formatos no banco
  const filter: Filter<Document> = {
    $or: [
      { "properties.cod_cpf": normalizedCPF },
      { "properties.cod_cpf": cpf }, // CPF original (pode estar formatado)
      // Também buscar por padrões comuns de formatação
      { "properties.cod_cpf": `${normalizedCPF.slice(0, 3)}.${normalizedCPF.slice(3, 6)}.${normalizedCPF.slice(6, 9)}-${normalizedCPF.slice(9)}` }
    ]
  };

  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    col.find(filter).skip(skip).limit(limit).toArray(),
    col.countDocuments(filter)
  ]);

  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
    items,
    cpf: normalizedCPF,
    cpfFormatado: `${normalizedCPF.slice(0, 3)}.${normalizedCPF.slice(3, 6)}.${normalizedCPF.slice(6, 9)}-${normalizedCPF.slice(9)}`
  };
}

