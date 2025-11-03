const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');

function extractToken(req) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return null;
  const [scheme, token] = authHeader.split(' ');
  if (!token || !/^Bearer$/i.test(scheme)) return null;
  return token;
}

/** Autenticação: exige token de acesso válido (emitido ao realizar login) */
function authMiddleware(req, res, next) {
  const token = extractToken(req);
  if (!token) return res.status(401).json({ message: 'Token não fornecido' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!decoded.scope || decoded.scope !== 'access') {
      return res.status(403).json({ message: 'Escopo inválido para esta ação' });
    }

    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ valid: false, message: 'Token inválido ou expirado' });
  }
}

/** Verifica escopo de tokens temporários (ex.: 'verify', 'reset', 'register') */
function verifyTokenScope(...expectedScopes) {
  return (req, res, next) => {
    const token = extractToken(req);
    if (!token) return res.status(401).json({ message: 'Token não fornecido' });

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      if (!decoded.scope || !expectedScopes.includes(decoded.scope)) {
        return res.status(403).json({ message: 'Escopo inválido para esta ação' });
      }

      req.user = decoded;
      next();
    } catch (err) {
      return res.status(401).json({ message: 'Token inválido ou expirado' });
    }
  };
}

/** RBAC(Role-Based Access Control): exigir papéis exatos */
function requireRoles(...allowed) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: 'Não autenticado' });
    const role = req.user.system_role;
    if (!allowed.includes(role)) return res.status(403).json({ message: 'Sem permissão' });
    next();
  };
}

/** RBAC(Role-Based Access Control): com hierarquia */
const ROLE_WEIGHT = { Guest: 0, User: 1, Admin: 2, Root: 3 };
function requireMinRole(minRole) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: 'Não autenticado' });
    const ok = (ROLE_WEIGHT[req.user.system_role] ?? -1) >= (ROLE_WEIGHT[minRole] ?? 999);
    if (!ok) return res.status(403).json({ message: 'Sem permissão' });
    next();
  };
}

/** Ownership: precisa ser o próprio usuário, comparando param (:userId) */
function requireSelfByParam(paramName = 'userId') {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: 'Não autenticado' });
    const target = String(req.params[paramName] ?? '');
    if (req.user.id !== target) return res.status(403).json({ message: 'Acesso negado' });
    next();
  };
}

/** Ownership: comparando e-mail do body */
function requireSelfByEmail(bodyKey = 'email') {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: 'Não autenticado' });
    const email = req.body?.[bodyKey];
    if (email && email !== req.user.email) {
      return res.status(403).json({ message: 'Acesso negado' });
    }
    next();
  };
}

/** RBAC OR Ownership: É o dono OU tem o papel necessário */
function selfOrRoles(roles = [], paramName) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: 'Não autenticado' });
    const roleOk = roles.includes(req.user.system_role);
    const byParam = paramName && String(req.params[paramName] ?? '') === req.user.id;
    const byEmail = req.body?.email && req.body.email === req.user.email;
    if (!roleOk && !byParam && !byEmail) return res.status(403).json({ message: 'Acesso negado' });
    next();
  };
}

/**
 * Cria um rate limiter customizado por rota.
 * @param {number} maxTentativas - número máximo de requisições permitidas
 * @param {number} janelaMinutos - tempo da janela em minutos
 * @param {string} mensagem - mensagem de erro personalizada
 */
function createRateLimiter(maxTentativas, janelaMinutos, mensagem) {
  return rateLimit({
    windowMs: janelaMinutos * 60 * 1000,
    max: maxTentativas,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: mensagem }
  });
}

module.exports = {
  authMiddleware,
  verifyTokenScope,
  requireRoles,
  requireMinRole,
  requireSelfByParam,
  requireSelfByEmail,
  selfOrRoles,
  createRateLimiter, 
};
