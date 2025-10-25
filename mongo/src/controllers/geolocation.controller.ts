import { Request, Response, NextFunction } from "express";
import { parsePagination } from "../utils/pagination.js";
import {
    createGeoLocationSchema,
    updateGeoLocationSchema
} from "../schemas/geolocation.schema.js";
import * as service from "../services/geolocation.service.js";

/**
 * Lista todas as GeoLocations com paginação
 */
export async function list(req: Request, res: Response, next: NextFunction) {
    try {
        const { page, limit, skip } = parsePagination(req.query);
        const data = await service.listGeoLocations({ page, limit, skip });
        res.json(data);
    } catch (err) {
        next(err);
    }
}

/**
 * Busca uma GeoLocation por ID
 */
export async function getOne(req: Request, res: Response, next: NextFunction) {
    try {
        const { id } = req.params;
        const doc = await service.getGeoLocationById(id);

        if (!doc) {
            return res.status(404).json({ error: "GeoLocation não encontrada" });
        }

        res.json(doc);
    } catch (err) {
        next(err);
    }
}

/**
 * Cria uma nova GeoLocation
 */
export async function create(req: Request, res: Response, next: NextFunction) {
    try {
        const parsed = createGeoLocationSchema.parse(req.body);
        const created = await service.createGeoLocation(parsed);

        res.status(201).json({
            message: "GeoLocation criada com sucesso",
            data: created
        });
    } catch (err) {
        next(err);
    }
}

/**
 * Atualiza uma GeoLocation
 */
export async function update(req: Request, res: Response, next: NextFunction) {
    try {
        const { id } = req.params;
        const parsed = updateGeoLocationSchema.parse(req.body);
        const updated = await service.updateGeoLocation(id, parsed);

        if (!updated) {
            return res.status(404).json({ error: "GeoLocation não encontrada" });
        }

        res.json({
            message: "GeoLocation atualizada com sucesso",
            data: updated
        });
    } catch (err) {
        next(err);
    }
}

/**
 * Deleta uma GeoLocation
 */
export async function remove(req: Request, res: Response, next: NextFunction) {
    try {
        const { id } = req.params;
        const deleted = await service.deleteGeoLocation(id);

        if (!deleted) {
            return res.status(404).json({ error: "GeoLocation não encontrada" });
        }

        res.status(204).send();
    } catch (err) {
        next(err);
    }
}

/**
 * Regenera o Plus Code de uma GeoLocation
 */
export async function regeneratePlusCode(req: Request, res: Response, next: NextFunction) {
    try {
        const { id } = req.params;
        const updated = await service.regeneratePlusCode(id);

        if (!updated) {
            return res.status(404).json({ error: "GeoLocation não encontrada" });
        }

        res.json({
            message: "Plus Code regenerado com sucesso",
            data: updated
        });
    } catch (err) {
        next(err);
    }
}

/**
 * Busca GeoLocations próximas a uma coordenada
 */
export async function findNearby(req: Request, res: Response, next: NextFunction) {
    try {
        const lat = req.query.lat ? Number(req.query.lat) : NaN;
        const lng = req.query.lng ? Number(req.query.lng) : NaN;

        if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
            return res.status(400).json({
                error: "Parâmetros inválidos: 'lat' e 'lng' são obrigatórios e devem ser numéricos."
            });
        }

        if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
            return res.status(400).json({
                error: "Coordenadas fora do intervalo. lat ∈ [-90,90], lng ∈ [-180,180]."
            });
        }

        // Raio opcional
        let maxDistanceMeters: number | undefined = undefined;
        if (req.query.maxDistanceMeters) {
            const m = Number(req.query.maxDistanceMeters);
            if (!Number.isFinite(m) || m <= 0) {
                return res.status(400).json({ error: "'maxDistanceMeters' deve ser > 0." });
            }
            maxDistanceMeters = m;
        } else if (req.query.radiusKm) {
            const km = Number(req.query.radiusKm);
            if (!Number.isFinite(km) || km <= 0) {
                return res.status(400).json({ error: "'radiusKm' deve ser > 0." });
            }
            maxDistanceMeters = km * 1000;
        }

        const limit = req.query.limit ? Number(req.query.limit) : 50;

        const data = await service.findNearbyGeoLocations({
            latitude: lat,
            longitude: lng,
            maxDistanceMeters,
            limit
        });

        res.json(data);
    } catch (err) {
        next(err);
    }
}

