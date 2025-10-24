const { db, queryAsync } = require("../configs/db");

const findAll = () => {
  return new Promise((resolve, reject) => {
    db.query("SELECT * FROM system_role", (err, results) => {
      if (err) return reject(err);
      resolve(results);
    });
  });
};

const findById = (id) => {
  return new Promise((resolve, reject) => {
    db.query("SELECT * FROM system_role WHERE id = ?", [id], (err, results) => {
      if (err) return reject(err);
      resolve(results[0]);
    });
  });
};

const create = ({ name, description, level }) => {
 
  return new Promise((resolve, reject) => {
    // Primeiro, verifica se já existe um papel do sistema com o mesmo nome
    db.query("SELECT id FROM system_role WHERE name = ?", [name], (err, results) => {
      if (err) return reject(err);

      if (results.length > 0) {
        return reject(new Error("Já existe um papel do sistema com esse nome."));
      }

      // Verifica se já existe um papel do sistema com o mesmo nível
      db.query("SELECT id FROM system_role WHERE level = ?", [level], (err, results) => {
        if (err) return reject(err);

        if (results.length > 0) {
            return reject(new Error("Já existe um papel do sistema com esse nível."));
        }

        // Se não existir, cria o novo papel do sistema
        db.query(
            "INSERT INTO system_role (name, description, level) VALUES (?, ?, ?)", 
            [name, description, level], 
            (err, result) => {
                if (err) return reject(err);
                resolve({ id: result.insertId, name });
            }
        );
      });    
    });
  });
};

const update = (id, { name, description, level }) => {

  return new Promise((resolve, reject) => {
    // Verifica se já existe um papel do sistema com o mesmo nome (evita duplicação)
    db.query("SELECT id FROM system_role WHERE name = ? AND id != ?", [name, id], (err, results) => {
      if (err) return reject(err);
      if (results.length > 0) return reject(new Error("Já existe um papel do sistema com esse nome."));

      // Verifica se já existe um papel do sistema com o mesmo nível
      db.query("SELECT id FROM system_role WHERE level = ? AND id != ?", [level, id], (err, results) => {
        if (err) return reject(err);
        if (results.length > 0) return reject(new Error("Já existe um papel do sistema com esse nível."));

        // Realiza o update
        db.query(
          "UPDATE system_role SET name = ?, description = ?, level = ? WHERE id = ?",
          [name, description, level, id],
          (err, result) => {
            if (err) return reject(err);
            resolve(result);
          }
        );
      });
    });
  });
};

const remove = (id) => {
  return new Promise((resolve, reject) => {
    db.query("DELETE FROM system_role WHERE id = ?", [id], (err, result) => {
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
