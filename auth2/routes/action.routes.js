const express = require("express");
const router = express.Router();
const actionController = require("../controllers/action.controller");

router.get("/", actionController.getAll);
router.get("/:id", actionController.getById);
router.post("/", actionController.create);
router.put("/:id", actionController.update);
router.delete("/:id", actionController.remove);

module.exports = router;
