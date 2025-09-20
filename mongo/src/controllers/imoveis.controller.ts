import { Request, Response, NextFunction } from "express";
import { parsePagination } from "../utils/pagination.js";
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
