const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/auth.controller');
const {
  authMiddleware,
  verifyTokenScope,
  requireRoles,
  requireMinRole,
  requireSelfByParam,
  requireSelfByEmail,
  selfOrRoles,
  createRateLimiter, 
} = require('../middlewares/auth.middleware');

const verifyCodeLimiter = createRateLimiter(
    500, // Atenção: O valor 500 é apenas um ajuste para desenvolvimento e teste. Ajustar posteriormente.
    10,
    'Muitas tentativas de verificação. Tente novamente em 10 minutos.'
);

router.post('/login', AuthController.login);
router.post('/guest-login', AuthController.guestLogin);
router.post('/logout', authMiddleware, AuthController.logout);

router.post('/verify-code', verifyCodeLimiter, verifyTokenScope('verify'), AuthController.checkCode);
router.post('/finalize-login', verifyCodeLimiter, verifyTokenScope('verify'), AuthController.finalizeLogin);

router.post('/start-reset-password', verifyCodeLimiter, AuthController.startResetPassword);
router.post('/reset-password', verifyCodeLimiter, AuthController.resetPassword);

router.post('/start-change-password', authMiddleware, requireRoles('Admin', 'Root', 'User'), verifyCodeLimiter, AuthController.startChangePassword);
router.post('/change-password', authMiddleware, requireRoles('Admin', 'Root', 'User'), verifyCodeLimiter, AuthController.ChangePassword);

router.get('/validate', authMiddleware, AuthController.validate);
router.get('/me', authMiddleware, AuthController.me);

router.post('/start-register', verifyCodeLimiter, AuthController.startRegistration);
router.post('/register', verifyCodeLimiter, AuthController.finalizeRegistration);

module.exports = router;
