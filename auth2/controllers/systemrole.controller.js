const systemRoleService = require("../services/systemrole.service");

const getAll = async (req, res) => {
  try {
    const roles = await systemRoleService.findAll();
    res.json(roles);
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar papéis do sistema" });
  }
};

const getById = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const role = await systemRoleService.findById(id);
    if (!role) return res.status(404).json({ message: "Papel do sistema não encontrado" });
    res.json(role);
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar papel do sistema" });
  }
};

const create = async (req, res) => {
  try {
    const { name, description, level, api_key } = req.body;
    if (!name) return res.status(400).json({ error: "O nome é obrigatório" });
    if (!description) return res.status(400).json({ error: "A descrição é obrigatória" });
    if (!level) return res.status(400).json({ error: "O nível é obrigatório" });

    const result = await systemRoleService.create({ name, description, level, api_key });
    res.status(201).json(result);
  } catch (err) {
    res.status(500).json({ error: "Erro ao criar papel do sistema" });
  }
};

const update = async (req, res) => {
  const id = parseInt(req.params.id);
  const { name, description, level, api_key } = req.body;

  try {
    const result = await systemRoleService.update(id, { name, description, level, api_key });
    res.status(200).json({ message: "Papel do sistema atualizado com sucesso", result });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

const remove = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await systemRoleService.remove(id);
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: "Erro ao deletar papel do sistema" });
  }
};

module.exports = {
  getAll,
  getById,
  create,
  update,
  remove,
};
