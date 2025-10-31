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

const create = ({ name, description, level, api_key }) => {
 
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
            "INSERT INTO system_role (name, description, level, api_key) VALUES (?, ?, ?, ?)", 
            [name, description, level, api_key], 
            (err, result) => {
                if (err) return reject(err);
                resolve({ id: result.insertId, name });
            }
        );
      });    
    });
  });
};

const update = (id, { name, description, level, api_key }) => {
  return new Promise((resolve, reject) => {
    // Primeiro busca os valores atuais
    db.query("SELECT * FROM system_role WHERE id = ?", [id], (err, results) => {
      if (err) return reject(err);
      if (results.length === 0) return reject(new Error("Papel não encontrado"));

      const current = results[0];

      // Usa os valores existentes se não vierem na requisição
      const updatedName = name ?? current.name;
      const updatedDescription = description ?? current.description;
      const updatedLevel = level ?? current.level;
      const updatedApiKey = api_key ?? current.api_key;

      // Verifica duplicação de nome
      db.query(
        "SELECT id FROM system_role WHERE name = ? AND id != ?",
        [updatedName, id],
        (err, results) => {
          if (err) return reject(err);
          if (results.length > 0) return reject(new Error("Já existe um papel do sistema com esse nome."));

          // Verifica duplicação de nível
          db.query(
            "SELECT id FROM system_role WHERE level = ? AND id != ?",
            [updatedLevel, id],
            (err, results) => {
              if (err) return reject(err);
              if (results.length > 0) return reject(new Error("Já existe um papel do sistema com esse nível."));

              // Atualiza
              db.query(
                "UPDATE system_role SET name = ?, description = ?, level = ?, api_key = ? WHERE id = ?",
                [updatedName, updatedDescription, updatedLevel, updatedApiKey, id],
                (err, result) => {
                  if (err) return reject(err);
                  resolve(result);
                }
              );
            }
          );
        }
      );
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
