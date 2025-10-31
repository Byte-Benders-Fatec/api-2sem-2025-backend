const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const { queryAsync } = require("../configs/db");

async function initSuperAdmin() {
  const [rows] = await queryAsync('SELECT id FROM user WHERE email = ?', [process.env.ADMIN_EMAIL]);

  if (rows.length > 0) {
    console.log('Usuário admin já existe.');
    return;
  }

  const userId = uuidv4();
  const passwordHash = await bcrypt.hash(process.env.ADMIN_PASSWORD, 10);

  // 1. Cria o usuário
  const userSql = `
    INSERT INTO user (id, name, email, cpf, system_role_id, is_active)
    VALUES (?, ?, ?, ?, ?, ?)
  `;
  const userValues = [
    userId,
    process.env.ADMIN_NAME,
    process.env.ADMIN_EMAIL,
    process.env.ADMIN_CPF,
    1, // ID do system_role "Root"
    1  // is_active
  ];
  await queryAsync(userSql, userValues);

  // 2. Cria a senha permanente
  const passwordSql = `
    INSERT INTO user_password (
      id, user_id, password_hash, is_temp, attempts, max_attempts,
      locked_until, status, expires_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  const passwordValues = [
    uuidv4(),
    userId,
    passwordHash,
    false,   // is_temp
    0,       // attempts
    10,      // max_attempts
    null,    // locked_until
    'valid', // status
    null     // expires_at
  ];
  await queryAsync(passwordSql, passwordValues);

  console.log('Usuário Super Admin criado com sucesso!');
}

module.exports = initSuperAdmin;
