const express = require("express");
const router = express.Router();
const permissionController = require("../controllers/permission.controller");

router.get("/", permissionController.getAll);
router.get("/:id", permissionController.getById);
router.post("/", permissionController.create);
router.put("/:id", permissionController.update);
router.delete("/:id", permissionController.remove);

module.exports = router;
