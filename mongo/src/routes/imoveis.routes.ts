import { Router } from "express";
import * as ctrl from "../controllers/imoveis.controller.js";

const router = Router();

router.get("/viewport", ctrl.listInViewport);
router.get("/near", ctrl.listNear);
router.get("/", ctrl.list);
router.get("/:id", ctrl.getOne);
router.post("/", ctrl.create);
router.put("/:id", ctrl.update);
router.delete("/:id", ctrl.remove);

export default router;
