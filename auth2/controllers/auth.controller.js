const authService = require('../services/auth.service');
const userPasswordService = require('../services/userPassword.service');

const AuthController = {
  login: async (req, res) => {
    const { email, password } = req.body;

    try {
      const result = await authService.login(email, password);
      return res.status(200).json({
        message: 'Código enviado por e-mail',
        ...result
      });
    } catch (err) {
      return res.status(401).json({
        error: "Erro ao fazer login", details: err.message
      });
    }
  },

  checkCode: async (req, res) => {
    const { email, code, type = 'login' } = req.body;
  
    if (email !== req.userEmail) {
      return res.status(403).json({
        error: "Erro ao verificar o código",
        details: "O e-mail fornecido não corresponde ao token"
      });
    }
  
    try {
      // Identifica dinamicamente o token correto conforme o tipo
      const tokenKey = `twofa_${type}_token`;
      const token = req.body[tokenKey];
  
      const result = await authService.verifyTwoFaCode(email, code, token, type);
      return res.status(200).json(result);
    } catch (err) {
      return res.status(400).json({
        error: "Erro ao verificar o código",
        details: err.message
      });
    }
  },

  finalizeLogin: async (req, res) => {
    const { email, code, type = 'login' } = req.body;
  
    if (email !== req.userEmail) {
      return res.status(403).json({
        error: "Erro ao finalizar login",
        details: "O e-mail fornecido não corresponde ao token"
      });
    }
  
    try {
      // Identifica dinamicamente o token correto conforme o tipo
      const tokenKey = `twofa_${type}_token`;
      const token = req.body[tokenKey];
  
      const result = await authService.finalizeLogin(email, code, token, type);
      return res.status(200).json(result);
    } catch (err) {
      return res.status(400).json({
        error: "Erro ao finalizar login",
        details: err.message
      });
    }
  },
  
  startResetPassword: async (req, res) => {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        error: "Erro ao solicitar recuperação de senha",
        details: "E-mail é obrigatório"
      });
    }

    try {
      const result = await authService.startResetPassword(email);
      return res.status(200).json(result);
    } catch (err) {
      return res.status(500).json({
        error: "Erro ao solicitar recuperação de senha",
        details: err.message
      });
    }
  },

  resetPassword: async (req, res) => {
    const { email, code, type = 'password_reset' } = req.body;

    if (!email && !code) {
      return res.status(400).json({
        error: "Erro ao solicitar recuperação de senha",
        details: "E-mail e código são obrigatórios"
      });
    }
    if (!email) {
      return res.status(400).json({
        error: "Erro ao solicitar recuperação de senha",
        details: "E-mail é obrigatório"
      });
    }
    if (!code) {
      return res.status(400).json({
        error: "Erro ao solicitar recuperação de senha",
        details: "Código é obrigatório"
      });
    }

    try {
      const result = await authService.finalizeResetPassword(email, code, type);
      return res.status(200).json(result);
    } catch (err) {
      return res.status(500).json({
        error: "Erro ao solicitar recuperação de senha",
        details: err.message
      });
    }
  },

  startChangePassword: async (req, res) => {
    const { email, new_password, current_password } = req.body;
  
    if (!email || !new_password || !current_password) {
      return res.status(400).json({
        error: "Erro ao solicitar alteração de senha",
        details: "E-mail, senha atual e nova senha são obrigatórios"
      });
    }
  
    try {
      const result = await authService.startChangePassword(email, new_password, current_password);
      return res.status(200).json(result);
    } catch (err) {
      return res.status(400).json({
        error: "Erro ao solicitar alteração de senha",
        details: err.message
      });
    }
  },

  ChangePassword: async (req, res) => {
    const { email, new_password, current_password, code, twofa_password_change_token = null, type = 'password_change' } = req.body;
  
    if (!email || !new_password || !current_password || !code) {
      return res.status(400).json({
        error: "Erro na alteração de senha",
        details: "E-mail, senha atual, nova senha e código são obrigatórios"
      });
    }
  
    try {
      const result = await authService.finalizeChangePassword(email, new_password, current_password, code, twofa_password_change_token, type);
      return res.status(200).json(result);
    } catch (err) {
      return res.status(400).json({
        error: "Erro na alteração de senha",
        details: err.message
      });
    }
  },

  validate: async (req, res) => {
    return res.status(200).json({ valid: true, user: req.user });
  },

  me: async (req, res) => {
    return res.status(200).json(req.user);
  }  
};

module.exports = AuthController;
