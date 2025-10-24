const { db, queryAsync } = require("../configs/db");
const { v4: uuidv4 } = require("uuid");

const findAll = () => {
  return new Promise((resolve, reject) => {
    db.query("SELECT user_id, name, mime_type, created_at, updated_at, deleted_at FROM user_photo", (err, results) => {
      if (err) return reject(err);
      resolve(results);
    });
  });
};

const findById = (id) => {
  return new Promise((resolve, reject) => {
    db.query("SELECT user_id, name, mime_type, created_at, updated_at, deleted_at FROM user_photo WHERE user_id = ?", [id], (err, results) => {
      if (err) return reject(err);
      resolve(results[0]);
    });
  });
};

const getContent = (id) => {
  return new Promise((resolve, reject) => {
    db.query("SELECT name, mime_type, content FROM user_photo WHERE user_id = ?", [id], (err, results) => {
      if (err) return reject(err);
      resolve(results[0]);
    });
  });
};

const create = (id, { name, mime_type, content }) => {
  return new Promise((resolve, reject) => {

    db.query("INSERT INTO user_photo (user_id, name, mime_type, content) VALUES (?, ?, ?, ?)", 
      [id, name, mime_type, content], 
      (err, result) => {
        if (err) return reject(err);
        resolve({ id, name, created: true });
      }
    );
  });
};

const update = (id, {name, mime_type, content}) => {
  return new Promise((resolve, reject) => {

    const sql = `UPDATE user_photo SET name = ?, mime_type = ?, content = ? WHERE user_id = ?`;
    const values = [name, mime_type, content, id];

    // Realiza o update
    db.query(sql, values, (err, result) => {
        if (err) return reject(err);
        resolve({ id, name, updated: true });
    });
  });
};

const upload = (id, { name, mime_type, content }) => {
  return new Promise((resolve, reject) => {
    // Verifica se já existe uma foto para o usuário
    db.query("SELECT user_id FROM user_photo WHERE user_id = ?", [id], (err, results) => {
      if (err) return reject(err);     
      if (results.length > 0) {
        // Já existe: atualiza
        update(id, { name, mime_type, content })
          .then(resolve)
          .catch(reject);
      } else {
        // Não existe: insere
        create(id, { name, mime_type, content })
          .then(resolve)
          .catch(reject);
      }
    });
  });
};

const remove = (id) => {
  return new Promise((resolve, reject) => {
    db.query("DELETE FROM user_photo WHERE user_id = ?", [id], (err, result) => {
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
  upload,
  remove,
};
