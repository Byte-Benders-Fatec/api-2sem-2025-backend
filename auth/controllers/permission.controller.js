const permissionService = require("../services/permission.service");

const getAll = async (req, res) => {
  try {
    const permissions = await permissionService.findAll();
    res.json(permissions);
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar permissão" });
  }
};

const getById = async (req, res) => {
  try {
    const id = req.params.id; // UUID é string
    const permission = await permissionService.findById(id);
    if (!permission) return res.status(404).json({ message: "Permissão não encontrada" });
    res.json(permission);
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar permissão" });
  }
};

const create = async (req, res) => {
  try {
    const { name, module_id, action_id } = req.body;
    if (!name) return res.status(400).json({ error: "O nome é obrigatório" });
    if (!module_id) return res.status(400).json({ error: "O id do módulo é obrigatório" });
    if (!action_id) return res.status(400).json({ error: "O id da ação é obrigatório" });

    const result = await permissionService.create({ name, module_id, action_id });
    res.status(201).json(result);
  } catch (err) {
    res.status(500).json({ error: "Erro ao criar permissão" });
  }
};

const update = async (req, res) => {
  const id = req.params.id;
  const { name, module_id, action_id } = req.body;

  try {
    const result = await permissionService.update(id, { name, module_id, action_id });
    res.status(200).json({ message: "Permissão atualizada com sucesso", result });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

const remove = async (req, res) => {
  try {
    const id = req.params.id;
    await permissionService.remove(id);
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: "Erro ao deletar permissão" });
  }
};

module.exports = {
  getAll,
  getById,
  create,
  update,
  remove,
};
