const { db, queryAsync } = require("../configs/db");

const findAll = () => {
  return new Promise((resolve, reject) => {
    db.query("SELECT * FROM action", (err, results) => {
      if (err) return reject(err);
      resolve(results);
    });
  });
};

const findById = (id) => {
  return new Promise((resolve, reject) => {
    db.query("SELECT * FROM action WHERE id = ?", [id], (err, results) => {
      if (err) return reject(err);
      resolve(results[0]);
    });
  });
};

const create = (name) => {
  return new Promise((resolve, reject) => {
    // Primeiro, verifica se já existe uma ação com o mesmo nome
    db.query("SELECT id FROM action WHERE name = ?", [name], (err, results) => {
      if (err) return reject(err);

      if (results.length > 0) {
        return reject(new Error("Já existe uma ação com esse nome."));
      }

      // Se não existir, cria a nova ação
      db.query("INSERT INTO action (name) VALUES (?)", [name], (err, result) => {
        if (err) return reject(err);
        resolve({ id: result.insertId, name });
      });
    });
  });
};

const update = (id, name) => {
  return new Promise((resolve, reject) => {
    // Verifica se já existe uma ação com o mesmo nome (evita duplicação)
    db.query("SELECT id FROM action WHERE name = ? AND id != ?", [name, id], (err, results) => {
      if (err) return reject(err);
      if (results.length > 0) return reject(new Error("Já existe uma ação com esse nome."));

      // Realiza o update
      db.query("UPDATE action SET name = ? WHERE id = ?", [name, id], (err, result) => {
        if (err) return reject(err);
        resolve(result);
      });
    });
  });
};

const remove = (id) => {
  return new Promise((resolve, reject) => {
    db.query("DELETE FROM action WHERE id = ?", [id], (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
  });
};

module.exports = {
  findAll,
  findById,
  create,
  update,
  remove,
};
