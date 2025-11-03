const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcrypt');
const { queryAsync } = require('../configs/db');
const { generateTemporaryPassword } = require("../utils/generateTemporaryPassword");
const { sendEmail } = require('../utils/sendEmail');

const validStatuses = ['valid', 'expired', 'blocked'];

const validatePassword = (password) => {
    const errors = [];

    if (!password || typeof password !== 'string') {
        throw new Error("A senha fornecida é inválida.");
    }

    if (password.length < 8) {
        errors.push("A senha deve ter no mínimo 8 caracteres.");
    }

    if (password.length > 64) {
        errors.push("A senha deve ter no máximo 64 caracteres.");
    }

    if (!/[a-z]/.test(password)) {
        errors.push("A senha deve conter ao menos uma letra minúscula.");
    }

    if (!/[A-Z]/.test(password)) {
        errors.push("A senha deve conter ao menos uma letra maiúscula.");
    }

    if (!/[0-9]/.test(password)) {
        errors.push("A senha deve conter ao menos um número.");
    }

    if (!/[!@#$%^&*()_\-+=\[\]{};':"\\|,.<>/?]/.test(password)) {
        errors.push("A senha deve conter ao menos um caractere especial.");
    }

    if (errors.length > 0) {
        throw new Error(errors.join('\n'));
    }

    return true;
};

const verifyPermanentPassword = async (user, current, inputPassword) => {
    
    // Configurações de bloqueio
    const configs = {
        times: {
          0 : 1, // 15
          1 : 5, // 30
          2 : 10, // 60
          3 : 15 // 360
        },
        max_attempts: {
          0: 10,
          1: 5,
          2: 2,
          3: 1
        }
    }
  
    const now = new Date();
    const lockedUntil = current.locked_until ? new Date (current.locked_until) : null;
  
    // Caso esteja bloqueada, mas já tenha expirado: resetar
    if (lockedUntil && lockedUntil < now) {
      await queryAsync(
        `UPDATE user_password
         SET locked_until = NULL
         WHERE id = ?`,
        [current.id]
      );
    }
  
    // Se ainda está bloqueada
    if (lockedUntil && lockedUntil >= now) {
      throw new Error(`Senha bloqueada até ${lockedUntil.toLocaleString('pt-BR')}`);
    }
  
    // Verifica se senha é correta
    const match = await bcrypt.compare(inputPassword, current.password_hash);
    if (!match) {
      const newAttempts = current.attempts + 1;
  
      // Se excedeu limite: bloquear
      if (newAttempts >= current.max_attempts) {

        const lockoutTime = configs.times[current.lockout_level];
        const blockUntil = new Date(now.getTime() + lockoutTime * 60 * 1000);
        const newLockoutLevel = current.lockout_level + 1 > 3 ? 3 : current.lockout_level + 1;
        const newMaxAttempts = configs.max_attempts[newLockoutLevel];

        await queryAsync(
          `UPDATE user_password SET attempts = ?, max_attempts = ?, locked_until = ?, lockout_level = ? WHERE id = ?`,
          [0, newMaxAttempts, blockUntil, newLockoutLevel, current.id]
        );
  
        // Envia e-mail de notificação
        await sendEmail({
          to: user.email,
          subject: 'Senha bloqueada temporariamente',
          text: `Detectamos ${current.max_attempts} tentativa(s) incorreta(s) de senha. Seu acesso está bloqueado por ${lockoutTime} minutos, até ${blockUntil.toLocaleString('pt-BR')}.`
        });
  
        throw new Error("Senha bloqueada por tentativas inválidas. Verifique seu e-mail.");
      }
  
      // Apenas incrementa tentativa
      await queryAsync(
        `UPDATE user_password SET attempts = ? WHERE id = ?`,
        [newAttempts, current.id]
      );
  
      throw new Error("Senha atual incorreta.");
    }
  
    // Senha correta: resetar tentativas e desbloqueio
    await queryAsync(
      `UPDATE user_password
       SET attempts = 0, max_attempts = ?, locked_until = NULL, lockout_level = 0
       WHERE id = ?`,
      [configs.max_attempts[0], current.id]
    );
  
    return true;
};

const verifyTemporaryPassword = async (user, current, inputPassword) => {
  const now = new Date();

  // Verifica expiração da senha temporária
  if (current.expires_at && new Date(current.expires_at) < now) {
    await queryAsync(
      `UPDATE user_password SET status = 'expired' WHERE id = ?`,
      [current.id]
    );
    throw new Error("Senha temporária expirada. Solicite uma nova.");
  }

  // Verifica se a senha está correta
  const match = await bcrypt.compare(inputPassword, current.password_hash);
  if (!match) {
    const newAttempts = current.attempts + 1;

    if (newAttempts >= current.max_attempts) {
      // Marca como bloqueada
      await queryAsync(
        `UPDATE user_password SET attempts = ?, status = 'blocked' WHERE id = ?`,
        [newAttempts, current.id]
      );

      await sendEmail({
        to: user.email,
        subject: 'Senha temporária bloqueada',
        text: `Você excedeu o número máximo de tentativas com sua senha temporária. Por favor, gere uma nova para continuar.`
      });

      throw new Error("Senha temporária bloqueada por excesso de tentativas. Solicite uma nova.");
    }

    // Apenas incrementa tentativa
    await queryAsync(
      `UPDATE user_password SET attempts = ? WHERE id = ?`,
      [newAttempts, current.id]
    );

    throw new Error("Senha temporária incorreta.");
  }

  // Sucesso: marca como expirada (uso único) - Desabilitado
  // await queryAsync(
  //   `UPDATE user_password SET status = 'expired' WHERE id = ?`,
  //   [current.id]
  // );

  return true;
};

const verifyPassword = async (email, inputPassword) => {
  // Verifica se o usuário existe e está ativo
  const [userRows] = await queryAsync(
    'SELECT id, name, email FROM user WHERE email = ? AND is_active = TRUE',
    [email]
  );
  const user = userRows[0];
  if (!user) throw new Error("Usuário não encontrado.");
  const userId = user.id;

  // Busca a senha permanente válida
  const [permRows] = await queryAsync(
    `SELECT * FROM user_password
     WHERE user_id = ? AND is_temp = false AND status = 'valid'
     ORDER BY created_at DESC LIMIT 1`,
    [userId]
  );
  const permanentPassword = permRows[0];

  // Busca a senha temporária válida
  const [tempRows] = await queryAsync(
    `SELECT * FROM user_password
     WHERE user_id = ? AND is_temp = true AND status = 'valid'
     ORDER BY created_at DESC LIMIT 1`,
    [userId]
  );
  const temporaryPassword = tempRows[0];

  // Nenhuma senha válida encontrada
  if (!permanentPassword && !temporaryPassword) {
    throw new Error('Nenhuma senha válida foi encontrada para este usuário.');
  }

  // Verificação delegada
  if (temporaryPassword) {
    return await verifyTemporaryPassword(user, temporaryPassword, inputPassword);
  } else {
    return await verifyPermanentPassword(user, permanentPassword, inputPassword);
  }
};

const checkPasswordSetup = async (email, newPassword, currentPassword = null) => {
  // Verifica se o usuário existe e está ativo
  const [userCheck] = await queryAsync(
    'SELECT id, name, email FROM user WHERE email = ? AND is_active = TRUE',
    [email]
  );
  const user = userCheck[0];
  if (!user) throw new Error("Usuário não encontrado.");

  const userId = user.id;

  // Verifica se a nova senha é válida (critérios de segurança)
  validatePassword(newPassword);

  // Verifica a senha atual, se fornecida
  if (currentPassword) {
    await verifyPassword(email, currentPassword);
  }

  // Verifica se a nova senha já foi usada anteriormente
  const [previousPasswords] = await queryAsync(
    `SELECT password_hash FROM user_password
     WHERE user_id = ? AND is_temp = false`,
    [userId]
  );

  for (const row of previousPasswords) {
    const reused = await bcrypt.compare(newPassword, row.password_hash);
    if (reused) {
      throw new Error('Esta senha já foi usada anteriormente. Escolha outra.');
    }
  }
  
  return {
    success: true,
    user
  };
};

const setPassword = async (email, newPassword, currentPassword = null) => {
  try {

    const { user } = await checkPasswordSetup(email, newPassword, currentPassword);
    const userId = user.id;

    // Bloqueia senhas anteriores (temporárias ou permanentes)
    await queryAsync(
        `UPDATE user_password
        SET status = 'blocked'
        WHERE user_id = ? AND status = 'valid'`,
        [userId]
    );

    // Insere nova senha como válida
    const id = uuidv4();
    const hash = await bcrypt.hash(newPassword, 10);
    await queryAsync(
        `INSERT INTO user_password (
          id, user_id, password_hash, is_temp, attempts, max_attempts, locked_until,
          status, expires_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          userId,
          hash,
          false,       // is_temp
          0,           // attempts
          10,          // max_attempts
          null,        // locked_until
          'valid',     // status
          null,        // expires_at
        ]
    );
      
    // Remove senhas antigas permanentes (mantém no máximo 5 contando com a válida)
    const [all] = await queryAsync(
      `SELECT id FROM user_password
       WHERE user_id = ?
         AND is_temp = FALSE
         AND status IN ('expired', 'blocked')
       ORDER BY created_at DESC`,
      [userId]
    );

    if (all.length > 4) {
        const toDelete = all.slice(4).map(row => row.id);
        const placeholders = toDelete.map(() => '?').join(', ');
        await queryAsync(
        `DELETE FROM user_password WHERE id IN (${placeholders})`,
        toDelete
        );
    }

    // Remove senhas antigas temporárias (mantém no máximo 5 contando com a válida)
    const [allTemp] = await queryAsync(
      `SELECT id FROM user_password
       WHERE user_id = ?
         AND is_temp = TRUE
         AND status IN ('expired', 'blocked')
       ORDER BY created_at DESC`,
      [userId]
    );

    if (allTemp.length > 4) {
        const toDelete = allTemp.slice(4).map(row => row.id);
        const placeholders = toDelete.map(() => '?').join(', ');
        await queryAsync(
        `DELETE FROM user_password WHERE id IN (${placeholders})`,
        toDelete
        );
    }

    // await sendEmail({
    //   to: user.email,
    //   subject: '...',
    //   text: `...`
    // });

    await sendEmail({
      to: user.email,
      subject: 'Senha atualizada com sucesso',
      text: `Olá ${user.name},
    
    Sua senha foi alterada com sucesso em ${new Date().toLocaleString('pt-BR')}.
    Se você não reconhece essa alteração, recomendamos que acesse o sistema e altere sua senha imediatamente.
    
    Em caso de dúvidas, entre em contato com o suporte.
    
    Atenciosamente,
    Equipe de Segurança do Sistema`
    });
    
    return { message: 'Senha atualizada com sucesso.' };
  } catch (error) {
    throw error;
  }
};

const resetPassword = async (email) => {
  // Verifica se o usuário existe
  const [users] = await queryAsync("SELECT id, name, email FROM user WHERE email = ? AND is_active = TRUE", [email]);
  const user = users[0];
  if (!user) {
    // Retorna resposta genérica (para evitar enumeração de e-mails)
    return { message: "Se o e-mail estiver cadastrado, você receberá uma senha temporária." };
  }
  const userId = user.id;

  // Gera senha temporária
  const tempPassword = generateTemporaryPassword(10); // Ex: 10 caracteres
  const hash = await bcrypt.hash(tempPassword, 10);
  const id = uuidv4();

  // Bloqueia senhas anteriores (temporárias ou permanentes)
  await queryAsync(
    `UPDATE user_password
    SET status = 'blocked'
    WHERE user_id = ? AND status = 'valid'`,
    [userId]
  );

  // Cria nova senha temporária
  await queryAsync(
    `INSERT INTO user_password (
      id, user_id, password_hash, is_temp, attempts, max_attempts, locked_until,
      status, expires_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      userId,
      hash,
      true,              // is_temp
      0,                 // attempts
      5,                 // max_attempts
      null,              // locked_until
      "valid",           // status
      new Date(Date.now() + 30 * 60 * 1000) // 30 minutos
    ]
  );

  // Remove senhas antigas permanentes (mantém no máximo 5 contando com a válida)
  const [all] = await queryAsync(
    `SELECT id FROM user_password
      WHERE user_id = ?
        AND is_temp = FALSE
        AND status IN ('expired', 'blocked')
      ORDER BY created_at DESC`,
    [userId]
  );

  if (all.length > 4) {
      const toDelete = all.slice(4).map(row => row.id);
      const placeholders = toDelete.map(() => '?').join(', ');
      await queryAsync(
      `DELETE FROM user_password WHERE id IN (${placeholders})`,
      toDelete
      );
  }

  // Remove senhas antigas temporárias (mantém no máximo 5 contando com a válida)
  const [allTemp] = await queryAsync(
    `SELECT id FROM user_password
      WHERE user_id = ?
        AND is_temp = TRUE
        AND status IN ('expired', 'blocked')
      ORDER BY created_at DESC`,
    [userId]
  );

  if (allTemp.length > 4) {
      const toDelete = allTemp.slice(4).map(row => row.id);
      const placeholders = toDelete.map(() => '?').join(', ');
      await queryAsync(
      `DELETE FROM user_password WHERE id IN (${placeholders})`,
      toDelete
      );
  }

  // Envia por e-mail
  await sendEmail({
    to: user.email,
    subject: "Recuperação de acesso",
    text: `Você solicitou a recuperação de acesso.\n\nSua senha temporária é: ${tempPassword}\n\nEla é válida por 30 minutos. Após o login, será solicitado que você crie uma nova senha.`
  });

  return { message: "Se o e-mail estiver cadastrado, você receberá uma senha temporária." };
};

module.exports = {
    validatePassword,
    verifyPassword,
    checkPasswordSetup,
    setPassword,
    resetPassword,
};
