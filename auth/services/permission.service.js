const { db, queryAsync } = require("../configs/db");
const { v4: uuidv4 } = require("uuid");

const findAll = () => {
  return new Promise((resolve, reject) => {
    db.query("SELECT * FROM permission", (err, results) => {
      if (err) return reject(err);
      resolve(results);
    });
  });
};

const findById = (id) => {
  return new Promise((resolve, reject) => {
    db.query("SELECT * FROM permission WHERE id = ?", [id], (err, results) => {
      if (err) return reject(err);
      resolve(results[0]);
    });
  });
};

const create = ({ name, module_id, action_id }) => {

  const system_defined = false;  
  
  return new Promise((resolve, reject) => {
    // Primeiro, verifica se já existe uma permissão com o mesmo nome
    db.query("SELECT id FROM permission WHERE name = ?", [name], (err, results) => {
      if (err) return reject(err);

      if (results.length > 0) {
        return reject(new Error("Já existe uma permissão com esse nome."));
      }

      const id = uuidv4();

      // Se não existir, cria a nova permissão
      db.query(
        "INSERT INTO permission (id, name, module_id, action_id, system_defined) VALUES (?, ?, ?, ?, ?)", 
        [id, name, module_id, action_id, system_defined], 
        (err, result) => {
            if (err) return reject(err);
            resolve({ id, name });
        }
      );
    });
  });
};

const update = (id, { name, module_id, action_id }) => {

  const system_defined = false;  

  return new Promise((resolve, reject) => {
    // Verifica se já existe uma permissão com o mesmo nome (evita duplicação)
    db.query("SELECT id FROM permission WHERE name = ? AND id != ?", [name, id], (err, results) => {
      if (err) return reject(err);
      if (results.length > 0) return reject(new Error("Já existe uma permissão com esse nome."));
    
      // Realiza o update
      db.query(
        "UPDATE permission SET name = ?, module_id = ?, action_id = ?, system_defined = ? WHERE id = ?",
        [name, module_id, action_id, system_defined, id],
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
    db.query("DELETE FROM permission WHERE id = ?", [id], (err, result) => {
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
