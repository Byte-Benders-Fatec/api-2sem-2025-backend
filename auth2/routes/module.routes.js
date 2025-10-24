const express = require("express");
const router = express.Router();
const moduleController = require("../controllers/module.controller");

router.get("/", moduleController.getAll);
router.get("/:id", moduleController.getById);
router.post("/", moduleController.create);
router.put("/:id", moduleController.update);
router.delete("/:id", moduleController.remove);

module.exports = router;
