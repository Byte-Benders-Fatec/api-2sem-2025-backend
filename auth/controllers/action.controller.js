const actionService = require("../services/action.service");

const getAll = async (req, res) => {
  try {
    const actions = await actionService.findAll();
    res.json(actions);
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar ações" });
  }
};

const getById = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const action = await actionService.findById(id);
    if (!action) return res.status(404).json({ message: "Ação não encontrada" });
    res.json(action);
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar ação" });
  }
};

const create = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: "O nome é obrigatório" });

    const result = await actionService.create(name);
    res.status(201).json({ id: result.insertId, name });
  } catch (err) {
    res.status(500).json({ error: "Erro ao criar ação" });
  }
};

const update = async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;

  try {
    const result = await actionService.update(id, name);
    res.status(200).json({ message: "Ação atualizada com sucesso", result });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

const remove = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await actionService.remove(id);
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: "Erro ao deletar ação" });
  }
};

module.exports = {
  getAll,
  getById,
  create,
  update,
  remove,
};
