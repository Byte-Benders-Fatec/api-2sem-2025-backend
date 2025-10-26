const express = require("express");
const router = express.Router();
const userPropertyController = require("../controllers/userProperty.controller");
const { authMiddleware } = require("../middlewares/auth.middleware");

// Todas as rotas requerem autenticação
router.use(authMiddleware);

// Salva múltiplas propriedades vindas do frontend (nova arquitetura)
router.post("/bulk-save", userPropertyController.bulkSave);

// Lista todas as propriedades do usuário logado
router.get("/", userPropertyController.getMyProperties);

// Busca uma propriedade específica por ID
router.get("/:id", userPropertyController.getById);

// Busca detalhes completos de uma propriedade no serviço mongo
router.get("/:id/mongo-details", userPropertyController.getMongoDetails);

// Atualiza uma propriedade
router.put("/:id", userPropertyController.update);

// Remove uma propriedade (soft delete)
router.delete("/:id", userPropertyController.remove);

module.exports = router;

