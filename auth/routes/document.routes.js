const express = require("express");
const router = express.Router();
const documentController = require("../controllers/document.controller");
const { upload, handleMulterError } = require("../middlewares/upload.middleware");

router.get("/:id/download", documentController.download);
router.get("/:id/view", documentController.view);
router.get("/", documentController.getAll);
router.get("/:id", documentController.getById);
router.post("/", upload.single("file"), documentController.upload);
router.put("/:id", documentController.update);
router.delete("/:id", documentController.remove);

// Middleware para capturar erros do multer
router.use(handleMulterError);

module.exports = router;
