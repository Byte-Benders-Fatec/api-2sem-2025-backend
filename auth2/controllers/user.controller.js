const userService = require("../services/user.service");
const bcrypt = require("bcrypt");
const { generateSqlFilters } = require("../utils/generateSqlFilters");

const getAll = async (req, res) => {
  try {
    const users = await userService.findAll();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar usuário" });
  }
};

const getByFilter = async (req, res) => {
  try {
    const filters = req.query;
    const { where, values } = generateSqlFilters(filters);

    const projects = await userService.findByFilters(where, values);
    res.json(projects);
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar projetos" })
  }
};

const getById = async (req, res) => {
  try {
    const id = req.params.id; // UUID é string
    const user = await userService.findById(id);
    if (!user) return res.status(404).json({ message: "Usuário não encontrado" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar usuário" });
  }
};

const create = async (req, res) => {
  try {
    const { name, email, cpf, system_role_id } = req.body;

    if (!name || !email || !cpf) {
      return res.status(400).json({ error: "Nome, e-mail e CPF são obrigatórios" });
    }

    const result = await userService.create({ name, email, cpf, system_role_id });
    res.status(201).json(result);
  } catch (err) {
    res.status(500).json({ error: "Erro ao criar usuário" });
  }
};

const update = async (req, res) => {
  const id = req.params.id;
  const { name, email, cpf, is_active, system_role_id } = req.body;

  const updatedFields = { name, email, cpf, is_active, system_role_id };
  
  const result = await userService.update(id, updatedFields);

  try {
    const result = await userService.update(id, updatedFields);
    res.status(200).json({ message: "Usuário atualizado com sucesso", result });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

const remove = async (req, res) => {
  try {
    const id = req.params.id;
    await userService.remove(id);
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: "Erro ao deletar usuário" });
  }
};

module.exports = {
  getAll,
  getByFilter,
  getById,
  create,
  update,
  remove,
};
