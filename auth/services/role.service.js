const { db, queryAsync } = require("../configs/db");
const { v4: uuidv4 } = require("uuid");

const findAll = () => {
  return new Promise((resolve, reject) => {
    db.query("SELECT * FROM role", (err, results) => {
      if (err) return reject(err);
      resolve(results);
    });
  });
};

const findById = (id) => {
  return new Promise((resolve, reject) => {
    db.query("SELECT * FROM role WHERE id = ?", [id], (err, results) => {
      if (err) return reject(err);
      resolve(results[0]);
    });
  });
};

const create = ({ name, description }) => {

  const is_default = false;
  const system_defined = false;  
  
  return new Promise((resolve, reject) => {
    // Primeiro, verifica se já existe um papel com o mesmo nome
    db.query("SELECT id FROM role WHERE name = ?", [name], (err, results) => {
      if (err) return reject(err);

      if (results.length > 0) {
        return reject(new Error("Já existe um papel com esse nome."));
      }

      const id = uuidv4();

      // Se não existir, cria o novo papel
      db.query(
        "INSERT INTO role (id, name, description, is_default, system_defined) VALUES (?, ?, ?, ?, ?)", 
        [id, name, description, is_default, system_defined], 
        (err, result) => {
            if (err) return reject(err);
            resolve({ id, name });
        }
      );
    });
  });
};

const update = (id, { name, description }) => {

  const is_default = false;
  const system_defined = false;  

  return new Promise((resolve, reject) => {
    // Verifica se já existe um papel com o mesmo nome (evita duplicação)
    db.query("SELECT id FROM role WHERE name = ? AND id != ?", [name, id], (err, results) => {
      if (err) return reject(err);
      if (results.length > 0) return reject(new Error("Já existe um papel com esse nome."));

      // Realiza o update
      db.query(
        "UPDATE role SET name = ?, description = ?, is_default = ?, system_defined = ? WHERE id = ?",
        [name, description, is_default, system_defined, id],
        (err, result) => {
            if (err) return reject(err);
            resolve(result);
        }
      );
    });
  });
};

const remove = (id) => {
  return new Promise((resolve, reject) => {
    db.query("DELETE FROM role WHERE id = ?", [id], (err, result) => {
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
