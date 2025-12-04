import { WithId, ObjectId } from "mongodb";
import "dotenv/config";
import { getCollection } from "../configs/db.js";
import {
    GeoLocation,
    GeoLocationCreateInput,
    GeoLocationUpdateInput,
    PlusCode,
    Address
} from "../schemas/geolocation.schema.js";

const COLLECTION = "geolocations";

/**
 * Interface para a resposta da API Geocoding do Google
 */
interface GoogleGeocodingResponse {
    results: Array<{
        plus_code?: {
            global_code: string;
            compound_code?: string;
        };
        formatted_address?: string;
        address_components?: Array<{
            long_name: string;
            short_name: string;
            types: string[];
        }>;
        geometry?: {
            location: {
                lat: number;
                lng: number;
            };
        };
    }>;
    plus_code?: {
        global_code: string;
        compound_code?: string;
    };
    status: string;
    error_message?: string;
}

/**
 * Gera Plus Code a partir de coordenadas usando Google Geocoding API
 */
async function callGoogleGeocodingAPI(
    latitude: number,
    longitude: number
): Promise<{ plusCode: PlusCode | null; address: Address | null }> {
    const apiKey = process.env.GOOGLE_GEOCODING_API_KEY;
    if (!apiKey) {
        throw new Error("GOOGLE_GEOCODING_API_KEY não configurada no .env");
    }

    const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
    url.searchParams.set("latlng", `${latitude},${longitude}`);
    url.searchParams.set("key", apiKey);

    try {
        const response = await fetch(url.toString());

        if (!response.ok) {
            throw new Error(`Google API retornou status ${response.status}: ${response.statusText}`);
        }

        const data = (await response.json()) as GoogleGeocodingResponse;

        if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
            throw new Error(
                `Google Geocoding API erro: ${data.status}${data.error_message ? ` - ${data.error_message}` : ""}`
            );
        }

        // Extrair Plus Code
        let plusCode: PlusCode | null = null;
        if (data.plus_code?.global_code) {
            plusCode = {
                global_code: data.plus_code.global_code,
                compound_code: data.plus_code.compound_code
            };
        } else if (data.results?.[0]?.plus_code?.global_code) {
            plusCode = {
                global_code: data.results[0].plus_code.global_code,
                compound_code: data.results[0].plus_code.compound_code
            };
        }

        // Extrair informações de endereço
        let address: Address | null = null;
        if (data.results?.[0]) {
            const result = data.results[0];
            const components = result.address_components || [];

            address = {
                formatted_address: result.formatted_address,
                street: components.find(c => c.types.includes("route"))?.long_name,
                neighborhood: components.find(c => c.types.includes("sublocality") || c.types.includes("neighborhood"))?.long_name,
                city: components.find(c => c.types.includes("locality") || c.types.includes("administrative_area_level_2"))?.long_name,
                state: components.find(c => c.types.includes("administrative_area_level_1"))?.short_name,
                country: components.find(c => c.types.includes("country"))?.long_name,
                postal_code: components.find(c => c.types.includes("postal_code"))?.long_name
            };
        }

        return { plusCode, address };
    } catch (error) {
        if (error instanceof Error) {
            throw new Error(`Erro ao chamar Google Geocoding API: ${error.message}`);
        }
        throw new Error("Erro desconhecido ao chamar Google Geocoding API");
    }
}

/**
 * Cria uma nova GeoLocation
 */
export async function createGeoLocation(
    input: GeoLocationCreateInput
): Promise<WithId<GeoLocation>> {
    const col = getCollection<GeoLocation>(COLLECTION);

    // Validar coordenadas
    if (!Number.isFinite(input.latitude) || input.latitude < -90 || input.latitude > 90) {
        throw new Error(`Latitude inválida: ${input.latitude}. Deve estar entre -90 e 90.`);
    }
    if (!Number.isFinite(input.longitude) || input.longitude < -180 || input.longitude > 180) {
        throw new Error(`Longitude inválida: ${input.longitude}. Deve estar entre -180 e 180.`);
    }

    // Gerar Plus Code se solicitado
    let plusCode: PlusCode | null = null;
    let address: Address | null = null;

    if (input.generatePlusCode) {
        const result = await callGoogleGeocodingAPI(input.latitude, input.longitude);
        plusCode = result.plusCode;
        address = result.address;
    }

    // Criar documento
    const now = new Date();
    const doc: GeoLocation = {
        coordinates: {
            latitude: input.latitude,
            longitude: input.longitude
        },
        plus_code: plusCode || undefined,
        address: address || undefined,
        provider: input.generatePlusCode ? "google" : "manual",
        reference_type: input.reference_type || "entrance",
        metadata: input.description ? { description: input.description } : undefined,
        createdAt: now,
        updatedAt: now
    };

    const result = await col.insertOne(doc as any);
    const created = await col.findOne({ _id: result.insertedId });

    if (!created) {
        throw new Error("Erro ao criar GeoLocation");
    }

    return created as WithId<GeoLocation>;
}

/**
 * Busca uma GeoLocation por ID
 */
export async function getGeoLocationById(id: string): Promise<WithId<GeoLocation> | null> {
    const col = getCollection<GeoLocation>(COLLECTION);
    return col.findOne({ _id: new ObjectId(id) }) as Promise<WithId<GeoLocation> | null>;
}

/**
 * Lista todas as GeoLocations com paginação
 */
export async function listGeoLocations(opts: {
    page: number;
    limit: number;
    skip: number;
}) {
    const col = getCollection<GeoLocation>(COLLECTION);

    const cursor = col.find({}, {
        skip: opts.skip,
        limit: opts.limit,
        sort: { createdAt: -1 }
    });

    const [items, total] = await Promise.all([
        cursor.toArray(),
        col.countDocuments({})
    ]);

    return {
        page: opts.page,
        pageSize: opts.limit,
        total,
        totalPages: Math.ceil(total / opts.limit),
        items
    };
}

/**
 * Atualiza uma GeoLocation
 */
export async function updateGeoLocation(
    id: string,
    input: GeoLocationUpdateInput
): Promise<WithId<GeoLocation> | null> {
    const col = getCollection<GeoLocation>(COLLECTION);

    // Validar coordenadas se fornecidas
    if (input.latitude !== undefined) {
        if (!Number.isFinite(input.latitude) || input.latitude < -90 || input.latitude > 90) {
            throw new Error(`Latitude inválida: ${input.latitude}. Deve estar entre -90 e 90.`);
        }
    }
    if (input.longitude !== undefined) {
        if (!Number.isFinite(input.longitude) || input.longitude < -180 || input.longitude > 180) {
            throw new Error(`Longitude inválida: ${input.longitude}. Deve estar entre -180 e 180.`);
        }
    }

    const updateDoc: any = {
        updatedAt: new Date()
    };

    if (input.latitude !== undefined || input.longitude !== undefined) {
        const existing = await getGeoLocationById(id);
        if (!existing) return null;

        updateDoc["coordinates.latitude"] = input.latitude ?? existing.coordinates.latitude;
        updateDoc["coordinates.longitude"] = input.longitude ?? existing.coordinates.longitude;
    }

    if (input.plus_code) updateDoc.plus_code = input.plus_code;
    if (input.address) updateDoc.address = input.address;
    if (input.metadata) updateDoc.metadata = input.metadata;

    await col.updateOne(
        { _id: new ObjectId(id) },
        { $set: updateDoc }
    );

    return getGeoLocationById(id);
}

/**
 * Deleta uma GeoLocation
 */
export async function deleteGeoLocation(id: string): Promise<boolean> {
    const col = getCollection<GeoLocation>(COLLECTION);
    const result = await col.deleteOne({ _id: new ObjectId(id) });
    return result.deletedCount === 1;
}

/**
 * Regenera o Plus Code de uma GeoLocation existente
 */
export async function regeneratePlusCode(id: string): Promise<WithId<GeoLocation> | null> {
    const existing = await getGeoLocationById(id);
    if (!existing) return null;

    const { plusCode, address } = await callGoogleGeocodingAPI(
        existing.coordinates.latitude,
        existing.coordinates.longitude
    );

    if (!plusCode) {
        throw new Error("Não foi possível gerar Plus Code para as coordenadas fornecidas");
    }

    const col = getCollection<GeoLocation>(COLLECTION);
    await col.updateOne(
        { _id: new ObjectId(id) },
        {
            $set: {
                plus_code: plusCode,
                address: address || undefined,
                provider: "google",
                updatedAt: new Date()
            }
        }
    );

    return getGeoLocationById(id);
}

/**
 * Busca GeoLocations próximas a uma coordenada
 */
export async function findNearbyGeoLocations(opts: {
    latitude: number;
    longitude: number;
    maxDistanceMeters?: number;
    limit?: number;
}) {
    const col = getCollection(COLLECTION);
    const limit = Math.max(1, Math.min(opts.limit ?? 50, 500));

    // Criar índice geoespacial se não existir
    // db.geolocations.createIndex({ "coordinates": "2dsphere" })

    const pipeline: any[] = [
        {
            $geoNear: {
                near: {
                    type: "Point",
                    coordinates: [opts.longitude, opts.latitude]
                },
                distanceField: "distance",
                spherical: true,
                ...(opts.maxDistanceMeters ? { maxDistance: opts.maxDistanceMeters } : {})
            }
        },
        { $limit: limit }
    ];

    const items = await col.aggregate(pipeline).toArray();
    return { items, total: items.length };
}

