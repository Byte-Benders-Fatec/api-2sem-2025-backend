const multer = require("multer");

// Configura o armazenamento em memória
const storage = multer.memoryStorage();

// Define o upload com limites
const upload = multer({
  storage,
  limits: { fileSize: 16 * 1024 * 1024 } // 16MB
});

// Middleware para tratar erros de tamanho de arquivo
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({ error: "Arquivo muito grande. Limite de 16MB." });
  }
  next(err);
};

module.exports = {
  upload,
  handleMulterError
};
