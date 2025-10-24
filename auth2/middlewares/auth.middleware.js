const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');

function extractToken(req) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return null;
  const [, token] = authHeader.split(' ');
  return token;
}

function authMiddleware(req, res, next) {
  const token = extractToken(req);
  if (!token) return res.status(401).json({ message: 'Token não fornecido' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ valid: false, message: 'Token inválido ou expirado' });
  }
}

function verifyTokenScope(expectedScope) {
  return (req, res, next) => {
    const token = extractToken(req);
    if (!token) return res.status(401).json({ message: 'Token não fornecido' });

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      if (decoded.scope !== expectedScope) {
        return res.status(403).json({ message: 'Escopo inválido para esta ação' });
      }

      req.userEmail = decoded.email;
      next();
    } catch (err) {
      return res.status(401).json({ message: 'Token inválido ou expirado' });
    }
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

module.exports = { authMiddleware, verifyTokenScope, createRateLimiter };
