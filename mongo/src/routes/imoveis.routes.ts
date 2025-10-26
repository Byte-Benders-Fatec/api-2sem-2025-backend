import { Router } from "express";
import * as ctrl from "../controllers/imoveis.controller.js";

const router = Router();

// Rotas de busca especializadas (devem vir antes de rotas com parâmetros)
router.get("/viewport", ctrl.listInViewport);
router.get("/near", ctrl.listNear);
router.get("/cpf/:cpf", ctrl.listByCPF); // Busca por CPF

// CRUD básico
router.get("/", ctrl.list);
router.get("/:id", ctrl.getOne);
router.post("/", ctrl.create);
router.put("/:id", ctrl.update);
router.delete("/:id", ctrl.remove);

// Rotas de Plus Code
router.post("/:id/plus-code", ctrl.generatePlusCode);

export default router;
