const express = require("express");
const router = express.Router();
const userPhotoController = require("../controllers/userphoto.controller");

const multer = require("multer");
const storage = multer.memoryStorage(); // Armazena o arquivo na memória para envio ao banco
const upload = multer({
    storage,
    limits: { fileSize: 16 * 1024 * 1024 }, // 16MB
});

router.get("/:id/download", userPhotoController.download);
router.get("/:id/view", userPhotoController.view);
router.get("/", userPhotoController.getAll);
router.get("/:id", userPhotoController.getById);
router.put("/:id", upload.single("file"), userPhotoController.upload);
router.delete("/:id", userPhotoController.remove);

// Middleware para capturar erros do multer
router.use((err, req, res, next) => {
    if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ error: "Arquivo muito grande. Limite de 16MB." });
    }
    next(err); // Deixa outros erros seguirem para o handler padrão
});

module.exports = router;
