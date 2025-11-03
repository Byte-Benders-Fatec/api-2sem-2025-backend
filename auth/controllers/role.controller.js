const roleService = require("../services/role.service");

const getAll = async (req, res) => {
  try {
    const roles = await roleService.findAll();
    res.json(roles);
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar papéis" });
  }
};

const getById = async (req, res) => {
  try {
    const id = req.params.id; // UUID é string
    const role = await roleService.findById(id);
    if (!role) return res.status(404).json({ message: "Papel não encontrado" });
    res.json(role);
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar papel" });
  }
};

const create = async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ error: "O nome é obrigatório" });
    if (!description) return res.status(400).json({ error: "A descrição é obrigatória" });

    const result = await roleService.create({ name, description });
    res.status(201).json(result);
  } catch (err) {
    res.status(500).json({ error: "Erro ao criar papel" });
  }
};

const update = async (req, res) => {
  const id = req.params.id;
  const { name, description } = req.body;

  try {
    const result = await roleService.update(id, { name, description });
    res.status(200).json({ message: "Papel atualizado com sucesso", result });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

const remove = async (req, res) => {
  try {
    const id = req.params.id;
    await roleService.remove(id);
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: "Erro ao deletar papel" });
  }
};

module.exports = {
  getAll,
  getById,
  create,
  update,
  remove,
};
