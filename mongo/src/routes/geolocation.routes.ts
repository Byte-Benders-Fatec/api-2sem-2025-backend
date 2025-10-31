import { Router } from "express";
import * as ctrl from "../controllers/geolocation.controller.js";

const router = Router();

// Rotas de busca especializadas (devem vir antes de rotas com parâmetros)
router.get("/nearby", ctrl.findNearby);

// CRUD básico
router.get("/", ctrl.list);
router.get("/:id", ctrl.getOne);
router.post("/", ctrl.create);
router.put("/:id", ctrl.update);
router.delete("/:id", ctrl.remove);

// Ações especiais
router.post("/:id/regenerate-plus-code", ctrl.regeneratePlusCode);

export default router;

