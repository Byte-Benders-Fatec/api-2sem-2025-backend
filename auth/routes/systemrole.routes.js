const express = require("express");
const router = express.Router();
const systemRoleController = require("../controllers/systemrole.controller");

router.get("/", systemRoleController.getAll);
router.get("/:id", systemRoleController.getById);
router.post("/", systemRoleController.create);
router.put("/:id", systemRoleController.update);
router.delete("/:id", systemRoleController.remove);

module.exports = router;
