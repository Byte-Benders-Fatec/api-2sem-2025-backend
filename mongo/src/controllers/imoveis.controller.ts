import { Request, Response, NextFunction } from "express";
import { parsePagination } from "../utils/pagination.js";
import { parseFieldsToProjection } from "../utils/parseProjection.js";
import { parseViewportFromQuery } from "../utils/geo.js";
import { createImovelSchema, updateImovelSchema } from "../schemas/imovel.schema.js";
import * as service from "../services/imoveis.service.js";

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const municipio = req.query.municipio?.toString();
    const ind_status = req.query.ind_status?.toString();
    const cod_imovel = req.query.cod_imovel?.toString();

    const data = await service.listImoveis({ page, limit, skip, municipio, ind_status, cod_imovel });
    res.json(data);
  } catch (err) {
    next(err);
  }
}

export async function getOne(req: Request, res: Response, next: NextFunction) {
  try {
    const doc = await service.getImovelById(req.params.id);
    if (!doc) return res.status(404).json({ error: "Não encontrado" });
    res.json(doc);
  } catch (err) {
    next(err);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = createImovelSchema.parse(req.body);
    const created = await service.createImovel(parsed);
    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = updateImovelSchema.parse(req.body);
    const updated = await service.updateImovel(req.params.id, parsed);
    if (!updated) return res.status(404).json({ error: "Não encontrado" });
    res.json(updated);
  } catch (err) {
    next(err);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    const ok = await service.deleteImovel(req.params.id);
    if (!ok) return res.status(404).json({ error: "Não encontrado" });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

export async function listNear(req: Request, res: Response, next: NextFunction) {
  try {
    // lat/lng obrigatórios
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

    // paginação (reutiliza seu helper)
    const { page, limit } = parsePagination(req.query);

    // raio opcional (em metros). Aceita maxDistanceMeters OU radiusKm (um dos dois)
    let maxDistanceMeters: number | undefined = undefined;
    if (req.query.maxDistanceMeters) {
      const m = Number(req.query.maxDistanceMeters);
      if (!Number.isFinite(m) || m <= 0) {
        return res.status(400).json({ error: "'maxDistanceMeters' deve ser > 0 (em metros)." });
      }
      maxDistanceMeters = m;
    } else if (req.query.radiusKm) {
      const km = Number(req.query.radiusKm);
      if (!Number.isFinite(km) || km <= 0) {
        return res.status(400).json({ error: "'radiusKm' deve ser > 0." });
      }
      maxDistanceMeters = km * 1000;
    }

    // filtros opcionais iguais ao seu list atual
    const municipio  = req.query.municipio?.toString();
    const ind_status = req.query.ind_status?.toString();
    const cod_imovel = req.query.cod_imovel?.toString();

    // projeção opcional: ?fields=properties.cod_imovel,geometry
    const projection = parseFieldsToProjection(req.query.fields?.toString());

    // chama o service novo
    const data = await service.listImoveisNear({
      lat, lng,
      page, limit,
      maxDistanceMeters,
      municipio, ind_status, cod_imovel,
      projection
    });

    res.json(data);
  } catch (err) {
    next(err);
  }
}

export async function listInViewport(req: Request, res: Response, next: NextFunction) {
  try {
    const vp = parseViewportFromQuery({
      bbox: req.query.bbox?.toString(),
      sw: req.query.sw?.toString(),
      ne: req.query.ne?.toString(),
      swLat: req.query.swLat?.toString(),
      swLng: req.query.swLng?.toString(),
      neLat: req.query.neLat?.toString(),
      neLng: req.query.neLng?.toString(),
    });
    if ("error" in vp) return res.status(400).json({ error: vp.error });

    const { sw, ne } = vp;
    const { page, limit } = parsePagination(req.query);
    const municipio  = req.query.municipio?.toString();
    const ind_status = req.query.ind_status?.toString();
    const cod_imovel = req.query.cod_imovel?.toString();
    const projection = parseFieldsToProjection(req.query.fields?.toString());
    const mode = (req.query.mode?.toString() || "intersects").toLowerCase() === "within" ? "within" : "intersects";

    const data = await service.listImoveisInViewport({
      sw, ne, page, limit, municipio, ind_status, cod_imovel, projection, mode
    });
    res.json(data);
  } catch (err) { next(err); }
}
