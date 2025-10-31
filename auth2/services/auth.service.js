const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { queryAsync } = require('../configs/db');
const { sendEmail } = require('../utils/sendEmail');
const { verifyPassword, resetPassword, checkPasswordSetup, setPassword, validatePassword } = require('./userPassword.service'); 

const validTypes = ['login', 'password_reset', 'password_change', 'critical_action', 'registration'];

// Geração segura do código de 6 ou 12 dígitos com crypto
function generateVerificationCode(double = false) {
  const codePart1 = crypto.randomInt(100000, 1000000).toString(); // 6 dígitos
  let codePart2 = null;
  if (double) {
    codePart2 = crypto.randomInt(100000, 1000000).toString(); // 6 dígitos
  }
  const code = double ? codePart1 + codePart2 : codePart1;
  return {code, part1: codePart1, part2: codePart2}
}

// Remove códigos antigos, mantendo no máximo 5 por tipo
const pruneOldTwoFaCodes = async (userId, type) => {
  try {
    if (!validTypes.includes(type)) {
      throw new Error(`Tipo inválido. Tipos permitidos: ${validTypes.join(', ')}`);
    }

    const [userResult] = await queryAsync("SELECT id FROM user WHERE id = ?", [userId]);
    if (userResult.length === 0) {
      throw new Error("Usuário não encontrado.");
    }

    const [olderCodes] = await queryAsync(
      `
      SELECT id FROM (
        SELECT id
        FROM two_fa_code
        WHERE user_id = ? AND type = ?
        ORDER BY created_at DESC
        LIMIT 20 OFFSET 4
      ) AS codes_to_delete
      `,
      [userId, type]
    );

    if (olderCodes.length === 0) {
      return { message: "Nenhum código antigo para remover." };
    }

    const idsToDelete = olderCodes.map(row => row.id);
    const placeholders = idsToDelete.map(() => '?').join(', ');

    await queryAsync(
      `DELETE FROM two_fa_code WHERE id IN (${placeholders})`,
      idsToDelete
    );

    return { message: `${idsToDelete.length} código(s) antigos removido(s).` };
  } catch (error) {
    throw new Error("Erro ao remover códigos 2FA antigos: " + error.message);
  }
};

// Cria novo código 2FA com controle de tipo e limpeza prévia
const createTwoFaCode = async (user, type = 'login', minutes = 10) => {
  try {
    const userId = user.id;
    await pruneOldTwoFaCodes(userId, type); // Limpa os antigos

    // Validação de tipo
    if (!validTypes.includes(type)) {
      throw new Error(`Tipo de código 2FA inválido. Tipos permitidos: ${validTypes.join(', ')}`);
    }

    // Variável de ambiente define se token será criado
    // Só usa token em tipos que não são públicos (evita enumeração no reset-password)
    const useToken = process.env.TWO_FA_WITH_TOKEN === 'true' && type !== 'password_reset' && type !== 'registration';

    const { code, part1, part2 } = generateVerificationCode(useToken); // Gera código simples ou duplo
    const code_hash = await bcrypt.hash(code, 10);

    const id = uuidv4();
    const attempts = 0;
    const maxAttempts = 5;
    const status = 'pending';
    const createdAt = new Date();
    const expiresAt = new Date(Date.now() + minutes * 60 * 1000);
    const formattedExpiration = expiresAt.toLocaleString('pt-BR');

    const sql = `
      INSERT INTO two_fa_code (
        id, user_id, code_hash, is_double, attempts, max_attempts, status, created_at, expires_at, type
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const values = [id, userId, code_hash, useToken, attempts, maxAttempts, status, createdAt, expiresAt, type];
    await queryAsync(sql, values);

    // Criação do token com parte2 (caso código duplo)
    let twoFaToken = null;
    if (useToken) {
      const seconds = minutes * 60;
      twoFaToken = jwt.sign(
        { code: part2, type },
        process.env.JWT_SECRET,
        { expiresIn: seconds }
      );
    }

    // Envio do e-mail
    const disable2FA = process.env.SKIP_2FA === 'true';
    if (!disable2FA) {
      const subjectMap = {
        login: 'Código de acesso ao sistema',
        password_reset: 'Recuperação de senha',
        password_change: 'Confirmação de alteração de senha',
        critical_action: 'Confirmação de ação crítica',
        registration: 'Confirme seu cadastro'
      };

      const bodyMap = {
        login: `Use o código abaixo para fazer login no sistema.\n\nCódigo: ${part1}\nVálido até: ${formattedExpiration}`,
        password_reset: `Recebemos uma solicitação de recuperação de senha.\n\nCódigo: ${part1}\nVálido até: ${formattedExpiration}`,
        password_change: `Você solicitou a alteração de sua senha.\n\nCódigo: ${part1}\nVálido até: ${formattedExpiration}`,
        critical_action: `Confirme a ação crítica com o código abaixo.\n\nCódigo: ${part1}\nVálido até: ${formattedExpiration}`,
        registration: `Use o código abaixo para validar seu e-mail e ativar sua conta.\n\nCódigo: ${part1}\nVálido até: ${formattedExpiration}`
      };

      await sendEmail({
        to: user.email,
        subject: subjectMap[type] || 'Código de verificação',
        text: bodyMap[type] || `Código: ${part1}\nVálido até: ${formattedExpiration}`
      });
    }

    return { code, part1, part2, token: twoFaToken };
  } catch (error) {
    throw new Error('Falha ao gerar o código de verificação: ' + error.message);
  }
};

const verifyTwoFaCode = async (email, submittedCode, tokenCode = null, type = 'login') => {
  if (!email || !submittedCode) throw new Error('E-mail e código são obrigatórios');

  // Validação de tipo
  if (!validTypes.includes(type)) {
    throw new Error(`Tipo de verificação inválido. Tipos permitidos: ${validTypes.join(', ')}`);
  }

  // Busca usuário ativo (ou inativo se for registro)
  const [users] = await queryAsync('SELECT * FROM user WHERE email = ?', [email]);
  const user = users[0];
  if (!user) throw new Error('Usuário não encontrado ou inativo');

 // Se o tipo NÃO for registro e o usuário estiver inativo.
  if (type !== 'registration' && !user.is_active) {
    throw new Error('Usuário não encontrado ou inativo');
  }

  // Busca o código mais recente pendente do tipo correto
  const [codes] = await queryAsync(
    `SELECT * FROM two_fa_code 
     WHERE user_id = ? AND type = ? AND status = 'pending'
     ORDER BY created_at DESC`,
    [user.id, type]
  );
  const codeCheck = codes[0];
  if (!codeCheck) throw new Error('Código não encontrado ou já utilizado');

  // Verifica expiração ou excesso de tentativas
  const isExpired = new Date(codeCheck.expires_at) < new Date();
  const tooManyAttempts = codeCheck.attempts >= codeCheck.max_attempts;
  if (isExpired || tooManyAttempts) {
    await queryAsync(`UPDATE two_fa_code SET status = 'denied' WHERE id = ?`, [codeCheck.id]);
    throw new Error('Código expirado ou número máximo de tentativas atingido');
  }

  // Verificação com ou sem token
  if (codeCheck.is_double) {
    if (!tokenCode) {
      // Conta como tentativa inválida
      await queryAsync(`UPDATE two_fa_code SET attempts = attempts + 1 WHERE id = ?`, [codeCheck.id]);
      throw new Error('Token de verificação ausente para código duplo');
    }

    let decoded;
    try {
      decoded = jwt.verify(tokenCode, process.env.JWT_SECRET);
      if (decoded.type !== type) {
        await queryAsync(`UPDATE two_fa_code SET attempts = attempts + 1 WHERE id = ?`, [codeCheck.id]);
        throw new Error('Token inválido para este tipo de verificação');
      }
    } catch (err) {
      await queryAsync(`UPDATE two_fa_code SET attempts = attempts + 1 WHERE id = ?`, [codeCheck.id]);
      throw new Error('Token inválido ou expirado');
    }

    const fullCode = submittedCode + decoded.code;
    const isMatch = await bcrypt.compare(fullCode, codeCheck.code_hash);
    if (!isMatch) {
      await queryAsync(`UPDATE two_fa_code SET attempts = attempts + 1 WHERE id = ?`, [codeCheck.id]);
      throw new Error('Código incorreto');
    }
  } else {
    const isMatch = await bcrypt.compare(submittedCode, codeCheck.code_hash);
    if (!isMatch) {
      await queryAsync(`UPDATE two_fa_code SET attempts = attempts + 1 WHERE id = ?`, [codeCheck.id]);
      throw new Error('Código incorreto');
    }
  }

  // Marca como verificado
  await queryAsync(`UPDATE two_fa_code SET status = 'verified' WHERE id = ?`, [codeCheck.id]);

  return { success: true, user };
};

const login = async (email, password) => {
  if (!email || !password) {
    throw new Error('Email e senha são obrigatórios');
  }

  // Busca o usuário pelo e-mail
  const [users] = await queryAsync('SELECT * FROM user WHERE email = ? AND is_active = TRUE', [email]);
  const user = users[0];

  if (!user) {
    throw new Error('Credenciais inválidas');
  }

  await verifyPassword(email, password);

  const [roles] = await queryAsync('SELECT * FROM system_role WHERE id = ?', [user.system_role_id]);
  const system_role = roles[0];

  if (!system_role) {
    throw new Error('O usuário não possui papel de sistema atribuído');
  }

  // Geração e envio do código 2FA
  const { part1, token } = await createTwoFaCode(user, 'login', 15);
  const code = part1
  const disable2FA = process.env.SKIP_2FA === 'true';

  const loginToken = jwt.sign(
    { email: user.email, scope: 'verify' },
    process.env.JWT_SECRET,
    { expiresIn: '10m' }
  );

  return {
    login_token: loginToken,
    ...(token ? { twofa_login_token: token } : {}),
    ...(disable2FA ? { code } : {})
  };
};

const finalizeLogin = async (email, submittedCode, tokenCode = null, type = 'login') => {
  const verification = await verifyTwoFaCode(email, submittedCode, tokenCode, type);

  if (!verification.success || !verification.user) {
    throw new Error('Verificação falhou');
  }

  const user = verification.user;

  const [roles] = await queryAsync('SELECT * FROM system_role WHERE id = ?', [user.system_role_id]);
  const system_role = roles[0];
  if (!system_role) throw new Error('O usuário não possui papel de sistema atribuído');

  const accessToken = jwt.sign(
    {
      id: user.id,
      name: user.name,
      email: user.email,
      cpf: user.cpf,
      system_role: system_role.name,
      api_key: system_role.api_key,
      scope: 'access'
    },
    process.env.JWT_SECRET,
    {  expiresIn: process.env.JWT_EXPIRES_IN || '1h' }
  );

  return { token: accessToken };
};

const startResetPassword = async (email) => {
  if (!email) {
    throw new Error('E-mail é obrigatório');
  }

  // Busca o usuário pelo e-mail
  const [users] = await queryAsync('SELECT * FROM user WHERE email = ? AND is_active = TRUE', [email]);
  const user = users[0];

  if (!user) {
    return { success: true };
  }

  // Verifica se o usuário tem papel de sistema
  const [roles] = await queryAsync('SELECT * FROM system_role WHERE id = ?', [user.system_role_id]);
  const system_role = roles[0];

  if (!system_role) {
    return { success: true };
  }

  // Geração e envio do código 2FA
  const { code } = await createTwoFaCode(user, 'password_reset', 15);
  const disable2FA = process.env.SKIP_2FA === 'true';

  return {
    success: true,
    ...(disable2FA ? { code } : {})
  };
};

const finalizeResetPassword = async (email, submittedCode, type = 'password_reset') => {
  const verification = await verifyTwoFaCode(email, submittedCode, null, type);

  if (!verification.success || !verification.user) {
    throw new Error('Verificação falhou');
  }

  const user = verification.user;

  const [roles] = await queryAsync('SELECT * FROM system_role WHERE id = ?', [user.system_role_id]);
  const system_role = roles[0];
  if (!system_role) throw new Error('O usuário não possui papel de sistema atribuído');

  const result = await resetPassword(email);

  return { result };
};

const startChangePassword = async (email, newPassword, currentPassword) => {

  const { success, user } = await checkPasswordSetup(email, newPassword, currentPassword);

  // Geração e envio do código 2FA
  const { part1, token } = await createTwoFaCode(user, 'password_change', 15);
  const code = part1
  const disable2FA = process.env.SKIP_2FA === 'true';

  return {
    success,
    ...(token ? { twofa_password_change_token: token } : {}),
    ...(disable2FA ? { code } : {})
  };
};

const finalizeChangePassword = async (email, newPassword, currentPassword, submittedCode, tokenCode = null, type = 'password_change') => {

  const verification = await verifyTwoFaCode(email, submittedCode, tokenCode, type);
  if (!verification.success || !verification.user) {
    throw new Error('Verificação falhou');
  }

  const result = await setPassword(email, newPassword, currentPassword);
  return { result };
};

const startRegistration = async (name, email, cpf, password) => {
  if (!name || !email || !cpf || !password) {
    throw new Error('Nome, e-mail, CPF e senha são obrigatórios');
  }

  // Validar a complexidade da senha
  try {
    validatePassword(password);
  } catch (error) {
    throw new Error(`Senha inválida: ${error.message}`);
  }

  // Verificar unicidade (email e cpf)
  const [existingUsers] = await queryAsync('SELECT email, cpf FROM user WHERE email = ? OR cpf = ?', [email, cpf]);
  if (existingUsers.length > 0) {
    if (existingUsers[0].email === email) {
      throw new Error('Este e-mail já está em uso.');
    }
    if (existingUsers[0].cpf === cpf) {
      throw new Error('Este CPF já está em uso.');
    }
  }

  const defaultRoleId = 3; // Usuário Comum

  // Criar usuário inativo (is_active = false)
  const userId = uuidv4();
  const insertSql = `
    INSERT INTO user (id, name, email, cpf, is_active, system_role_id)
    VALUES (?, ?, ?, ?, ?, ?)
  `;
  await queryAsync(insertSql, [userId, name, email, cpf, false, defaultRoleId]);

  const newUser = { id: userId, email: email, name: name };

  // Salvar a senha para o novo usuário
  // (Não usamos setPassword() pois ele espera um usuário ATIVO. 
  // Fazemos a inserção manual, que é o correto para um novo usuário)
  const passwordId = uuidv4();
  const hash = await bcrypt.hash(password, 10);
  const insertPasswordSql = `
    INSERT INTO user_password (
      id, user_id, password_hash, is_temp, attempts, max_attempts, locked_until,
      status, expires_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  await queryAsync(insertPasswordSql, [
    passwordId,
    userId,
    hash,
    false,    // is_temp
    0,        // attempts
    10,       // max_attempts (padrão do seu setPassword)
    null,     // locked_until
    'valid',  // status
    null      // expires_at
  ]);

  // Enviar código de verificação
  const { part1 } = await createTwoFaCode(newUser, 'registration', 15);
  const code = part1;
  const disable2FA = process.env.SKIP_2FA === 'true';

  return {
    message: 'Usuário pré-cadastrado. Código de verificação enviado para o e-mail.',
    ...(disable2FA ? { code } : {})
  };
};

const finalizeRegistration = async (email, submittedCode, tokenCode = null, type = 'registration') => {
  // 1. Verifica o código usando a função existente
  // O tokenCode é nulo, pois 'registration' não é do tipo 'double'
  const verification = await verifyTwoFaCode(email, submittedCode, tokenCode, type);

  if (!verification.success || !verification.user) {
    throw new Error('Verificação falhou. Código inválido ou expirado.');
  }

  const user = verification.user;

  // 2. Ativa o usuário no banco de dados
  await queryAsync('UPDATE user SET is_active = TRUE WHERE id = ?', [user.id]);

  return {
    success: true,
    message: 'Usuário cadastrado e ativado com sucesso. Você já pode fazer login.'
  };
};

const guestLogin = async () => {
  const [users] = await queryAsync('SELECT * FROM user WHERE name = ? LIMIT 1', ['Visitante']);
  let user = users && users[0];
  if (!user) {
    const name = 'Visitante';
    const email = 'visitante@byte.dev.br';
    const cpf = '00000000000';
    const is_active = 1;

    const [roles] = await queryAsync('SELECT * FROM system_role WHERE name = ? LIMIT 1', ['Guest']);
    const role = roles && roles[0];
    const systemRoleId = role?.id;
    if (!systemRoleId) {
      throw new Error('Papel "Guest" não encontrado. Verifique o seed de system_role.');
    }

    const insertSql = `
      INSERT INTO user (id, name, email, cpf, is_active, system_role_id)
      VALUES (UUID(), ?, ?, ?, ?, ?)
    `;
    await queryAsync(insertSql, [name, email, cpf, is_active, systemRoleId]);

    const [newUserRows] = await queryAsync(
      'SELECT * FROM user WHERE name = ? LIMIT 1',
      ['Visitante']
    );
    user = newUserRows && newUserRows[0];
  }

  const [roles] = await queryAsync('SELECT * FROM system_role WHERE id = ? LIMIT 1', [user.system_role_id]);
  const system_role = roles[0];
  if (!system_role) throw new Error('O usuário não possui papel de sistema atribuído');

  const accessToken = jwt.sign(
    {
      id: user.id,
      name: user.name,
      email: user.email,
      cpf: user.cpf,
      system_role: system_role.name,
      api_key: system_role.api_key,
      scope: 'access'
    },
    process.env.JWT_SECRET,
    {  expiresIn: process.env.JWT_EXPIRES_IN || '1h' }
  );

  return { token: accessToken };
}

module.exports = {
  pruneOldTwoFaCodes,
  createTwoFaCode,
  verifyTwoFaCode,
  login,
  finalizeLogin,
  startResetPassword,
  finalizeResetPassword,
  startChangePassword,
  finalizeChangePassword,
  startRegistration,
  finalizeRegistration,
  guestLogin,
};
