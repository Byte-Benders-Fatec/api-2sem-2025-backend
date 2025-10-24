const { db, queryAsync } = require("../configs/db");
const { v4: uuidv4 } = require("uuid");

const findAll = () => {
  return new Promise((resolve, reject) => {
    db.query("SELECT id, name, mime_type, is_active, created_at, updated_at, deleted_at FROM document", (err, results) => {
      if (err) return reject(err);
      resolve(results);
    });
  });
};

const findById = (id) => {
  return new Promise((resolve, reject) => {
    db.query("SELECT id, name, mime_type, is_active, created_at, updated_at, deleted_at FROM document WHERE id = ?", [id], (err, results) => {
      if (err) return reject(err);
      resolve(results[0]);
    });
  });
};

const getContent = (id) => {
  return new Promise((resolve, reject) => {
    db.query("SELECT name, mime_type, content FROM document WHERE id = ?", [id], (err, results) => {
      if (err) return reject(err);
      resolve(results[0]);
    });
  });
};

const create = ({ name, mime_type, content }) => {
  return new Promise((resolve, reject) => {

    const id = uuidv4();
    const is_active = true;

    db.query("INSERT INTO document (id, name, mime_type, content, is_active) VALUES (?, ?, ?, ?, ?)", 
      [id, name, mime_type, content, is_active], 
      (err, result) => {
        if (err) return reject(err);
        resolve({ id, name });
      }
    );
  });
};

const update = (id, {name, is_active}) => {
  return new Promise((resolve, reject) => {

    // Monta dinamicamente os campos a serem atualizados
    const fields = [];
    const values = [];

    if (name !== undefined) {
      fields.push("name = ?");
      values.push(name);
    }

    if (is_active !== undefined) {
      fields.push("is_active = ?");
      values.push(is_active);
    }

    // Garante que ao menos um campo será atualizado
    if (fields.length === 0) {
      return reject(new Error("Nenhum dado para atualizar."));
    }

    const sql = `UPDATE document SET ${fields.join(", ")} WHERE id = ?`;
    values.push(id);

    // Realiza o update
    db.query(sql, values, (err, result) => {
        if (err) return reject(err);
        resolve(result);
    });
  });
};

const remove = (id) => {
  return new Promise((resolve, reject) => {
    db.query("DELETE FROM document WHERE id = ?", [id], (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
  });
};

module.exports = {
  findAll,
  findById,
  getContent,
  create,
  update,
  remove,
};
