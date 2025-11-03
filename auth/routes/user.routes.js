const express = require("express");
const router = express.Router();
const userController = require("../controllers/user.controller");
const userPasswordController = require('../controllers/userPassword.controller');

// POST: Criação de nova senha (ex: primeiro acesso ou recuperação)
// PUT: Atualização da senha atual (ex: troca de senha autenticado)
router.post('/password', userPasswordController.setNewPassword);
router.put('/password', userPasswordController.changePassword);
router.get("/", userController.getAll);
router.get("/filters", userController.getByFilter);
router.get("/:id", userController.getById);
router.post("/", userController.create);
router.put("/:id", userController.update);
router.delete("/:id", userController.remove);

module.exports = router;
