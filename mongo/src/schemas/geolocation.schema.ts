import { z } from "zod";
import { WithId } from "mongodb";

/**
 * Regex para validação de Plus Codes (Open Location Code)
 * Formato: 8 caracteres + '+' + 2-7 caracteres
 * Alfabeto: 23456789CFGHJMPQRVWX
 */
const OLC_ALPHABET = "23456789CFGHJMPQRVWX";
const OLC_REGEX = new RegExp(`^[${OLC_ALPHABET}]{8}\\+[${OLC_ALPHABET}]{2,7}$`, "i");

const normalizePlusCode = z
    .string()
    .transform((s) => s.trim().toUpperCase())
    .pipe(z.string().regex(OLC_REGEX, "Invalid global Plus Code"));

/**
 * Schema para Plus Code
 */
export const plusCodeSchema = z.object({
    global_code: normalizePlusCode,
    compound_code: z.string().min(4).max(150).optional()
});

/**
 * Schema para coordenadas geográficas
 */
export const coordinatesSchema = z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180)
});

/**
 * Schema para informações de endereço (opcional)
 */
export const addressSchema = z.object({
    formatted_address: z.string().optional(),
    street: z.string().optional(),
    neighborhood: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    country: z.string().optional(),
    postal_code: z.string().optional()
}).optional();

/**
 * Tipo de referência do ponto
 * - entrance: Entrada/portão da residência (padrão)
 * - center: Centro calculado do polígono do imóvel
 * - custom: Ponto customizado escolhido pelo usuário
 * - vertex: Um dos vértices do polígono do imóvel
 */
export const referenceTypeSchema = z.enum(["entrance", "center", "custom", "vertex"]).default("entrance");

/**
 * Schema base para GeoLocation
 */
export const geoLocationBaseSchema = z.object({
    coordinates: coordinatesSchema,
    plus_code: plusCodeSchema.optional(),
    address: addressSchema,
    provider: z.enum(["google", "manual"]).default("google"),
    reference_type: referenceTypeSchema.optional(),
    metadata: z.record(z.any()).optional()
});

/**
 * Schema para criação de GeoLocation
 */
export const createGeoLocationSchema = z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    generatePlusCode: z.boolean().default(true),
    reference_type: referenceTypeSchema.optional(),
    description: z.string().max(255).optional() // Ex: "Entrada principal", "Portão lateral"
});

/**
 * Schema para atualização de GeoLocation
 */
export const updateGeoLocationSchema = z.object({
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
    plus_code: plusCodeSchema.optional(),
    address: addressSchema,
    metadata: z.record(z.any()).optional()
});

/**
 * Schema completo de GeoLocation (com campos do banco)
 */
export const geoLocationSchema = geoLocationBaseSchema.extend({
    createdAt: z.date(),
    updatedAt: z.date()
});

/**
 * Tipos TypeScript
 */
export type PlusCode = z.infer<typeof plusCodeSchema>;
export type Coordinates = z.infer<typeof coordinatesSchema>;
export type Address = z.infer<typeof addressSchema>;
export type GeoLocationBase = z.infer<typeof geoLocationBaseSchema>;
export type GeoLocationCreateInput = z.infer<typeof createGeoLocationSchema>;
export type GeoLocationUpdateInput = z.infer<typeof updateGeoLocationSchema>;
export type GeoLocation = z.infer<typeof geoLocationSchema>;
export type GeoLocationDoc = WithId<GeoLocation>;

/**
 * Validação de Plus Code
 */
export function isValidPlusCode(code: string): boolean {
    return OLC_REGEX.test(code.trim().toUpperCase());
}

