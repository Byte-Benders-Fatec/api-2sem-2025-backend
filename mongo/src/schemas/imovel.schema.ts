import { z } from "zod";

/**
 * Regex simplificada para Global Plus Codes (8 + '+' + 2-7).
 * Aceita caracteres válidos no alfabeto OLC: 23456789CFGHJMPQRVWX
 * OCL = Open Location Code
 */
const OLC_ALPHABET = "23456789CFGHJMPQRVWX";
const OLC_REGEX = new RegExp(`^[${OLC_ALPHABET}]{8}\\+[${OLC_ALPHABET}]{2,7}$`, "i");

const coord = z.tuple([z.number(), z.number()]);
const linearRing = z.array(coord).min(4);
const polygonCoordinates = z.array(linearRing);

export const geometrySchema = z.object({
  type: z.literal("Polygon"),
  coordinates: polygonCoordinates
});

const normalizePlusCode = z
  .string()
  .transform((s: string) => s.trim().toUpperCase())
  .pipe(z.string().regex(OLC_REGEX, "Invalid global Plus Code"));

const plusCodeSchema = z.union([
  // String simples validada pelo regex
  normalizePlusCode,
  // Objeto estruturado
  z.object({
    global_code: normalizePlusCode,
    compound_code: z.string().min(4).max(120).optional(),
    provider: z.literal("google").optional()
  })
]).optional();

/**
 * Schema estendido para Plus Code com coordenadas
 */
const plusCodeWithCoordinates = z.object({
  global_code: normalizePlusCode,
  compound_code: z.string().min(4).max(120).optional(),
  coordinates: z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180)
  }).optional()
}).optional();

export const imovelBaseSchema = z.object({
  type: z.literal("Feature").optional(),
  geometry: geometrySchema,
  properties: z.object({
    cod_tema: z.string().optional(),
    nom_tema: z.string().optional(),
    cod_imovel: z.string().optional(),
    mod_fiscal: z.number().optional(),
    num_area: z.number().optional(),
    ind_status: z.string().optional(),
    ind_tipo: z.string().optional(),
    des_condic: z.string().optional(),
    municipio: z.string().optional(),
    cod_estado: z.string().optional(),
    dat_criaca: z.string().optional(),
    dat_atuali: z.string().optional(),
    cod_cpf: z.string().optional(),
    plus_code: plusCodeWithCoordinates
  })
});

export const createImovelSchema = imovelBaseSchema;
export const updateImovelSchema = imovelBaseSchema.partial();
export type ImovelInput = z.infer<typeof createImovelSchema>;
