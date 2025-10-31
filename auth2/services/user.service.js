const { db, queryAsync } = require("../configs/db");
const { v4: uuidv4 } = require("uuid");

const findAll = () => {
  return new Promise((resolve, reject) => {
    db.query("SELECT * FROM user", (err, results) => {
      if (err) return reject(err);
      resolve(results);
    });
  });
};

const findByFilters = (where, values) => {
  return new Promise((resolve, reject) => {
    db.query(`SELECT * FROM user ${where}`, values, (err, results) => {
      if (err) return reject(err);
      resolve(results);
    });
  });
};

const findById = (id) => {
  return new Promise((resolve, reject) => {
    db.query("SELECT * FROM user WHERE id = ?", [id], (err, results) => {
      if (err) return reject(err);
      resolve(results[0]);
    });
  });
};

const create = ({ name, email, cpf, system_role_id = null }) => {
  return new Promise(async (resolve, reject) => {
    try {
      // Verifica se o e-mail já existe
      const [existingEmail] = await queryAsync("SELECT id FROM user WHERE email = ?", [email]);
      if (existingEmail.length > 0) {
        return reject(new Error("Já existe um usuário com esse e-mail."));
      }
      // Verifica se o CPF já existe
      const [existingCpf] = await queryAsync("SELECT id FROM user WHERE cpf = ?", [cpf]);
      if (existingCpf.length > 0) {
        return reject(new Error("Já existe um usuário com esse CPF."));
      }

      let roleId = system_role_id;

      if (!roleId) {
        // Busca o id do role com name = 'User'
        const [roles] = await queryAsync("SELECT id FROM system_role WHERE name = 'User'");
        if (roles.length === 0) {
          return reject(new Error("Papel de sistema padrão 'User' não encontrado."));
        }
        roleId = roles[0].id;
      } else {
        // Verifica se o system_role_id passado é válido
        const [valid] = await queryAsync("SELECT id FROM system_role WHERE id = ?", [roleId]);
        if (valid.length === 0) {
          return reject(new Error("Papel de sistema informado é inválido."));
        }
      }

      const id = uuidv4();
      const is_active = true;

      // Insere o novo usuário
      await queryAsync(
        "INSERT INTO user (id, name, email, cpf, is_active, system_role_id) VALUES (?, ?, ?, ?, ?, ?)",
        [id, name, email, cpf, is_active, roleId]
      );

      resolve({ id, name });
    } catch (err) {
      reject(err);
    }
  });
};

const update = async (id, { name, email, cpf, is_active, system_role_id }) => {
  return new Promise(async (resolve, reject) => {
    try {
      // Verifica duplicidade de e-mail
      const [existingEmail] = await queryAsync("SELECT id FROM user WHERE email = ? AND id != ?", [email, id]);
      if (existingEmail.length > 0) {
        return reject(new Error("Já existe um usuário com esse e-mail."));
      }
      // Verifica duplicidade do CPF
      const [existingCpf] = await queryAsync("SELECT id FROM user WHERE cpf = ? AND id != ?", [cpf, id]);
      if (existingCpf.length > 0) {
        return reject(new Error("Já existe um usuário com esse CPF."));
      }

      // Se for informado um system_role_id, valida se ele existe
      if (system_role_id !== undefined) {
        const [validRole] = await queryAsync("SELECT id FROM system_role WHERE id = ?", [system_role_id]);
        if (validRole.length === 0) {
          return reject(new Error("Papel de sistema informado é inválido."));
        }
      }

      // Monta dinamicamente os campos a serem atualizados
      const fields = [];
      const values = [];

      if (name !== undefined) {
        fields.push("name = ?");
        values.push(name);
      }

      if (email !== undefined) {
        fields.push("email = ?");
        values.push(email);
      }

      if (cpf !== undefined) {
        fields.push("cpf = ?");
        values.push(cpf);
      }

      if (is_active !== undefined) {
        fields.push("is_active = ?");
        values.push(is_active);
      }

      if (system_role_id !== undefined) {
        fields.push("system_role_id = ?");
        values.push(system_role_id);
      }

      if (fields.length === 0) {
        return reject(new Error("Nenhum dado para atualizar."));
      }

      const sql = `UPDATE user SET ${fields.join(", ")} WHERE id = ?`;
      values.push(id);

      await queryAsync(sql, values);
      resolve({ message: 'Usuário atualizado com sucesso.' });
    } catch (err) {
      reject(err);
    }
  });
};

const remove = (id) => {
  return new Promise((resolve, reject) => {
    db.query("DELETE FROM user WHERE id = ?", [id], (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
  });
};

module.exports = {
  findAll,
  findByFilters,
  findById,
  create,
  update,
  remove,
};
