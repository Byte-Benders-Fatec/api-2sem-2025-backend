const userPasswordService = require('../services/userPassword.service');

const setNewPassword = async (req, res) => {
  const { email, new_password, confirm_password } = req.body;

  if (!email || !new_password || !confirm_password) {
    return res.status(400).json({
      error: "Erro ao criar senha",
      details: "E-mail, nova senha e confirmação são obrigatórios."
    });
  }

  if (new_password !== confirm_password) {
    return res.status(400).json({
      error: "Erro ao criar senha",
      details: "As senhas não coincidem."
    });
  }

  try {
    const result = await userPasswordService.setPassword(email, new_password);
    return res.status(201).json(result);
  } catch (err) {
    return res.status(400).json({
      error: "Erro ao criar senha",
      details: err.message
    });
  }
};

const changePassword = async (req, res) => {
  const { email, current_password, new_password, confirm_password } = req.body;

  if (!email || !current_password || !new_password || !confirm_password) {
    return res.status(400).json({
      error: "Erro ao alterar senha",
      details: "E-mail, senha atual, nova senha e confirmação são obrigatórios."
    });
  }

  if (new_password !== confirm_password) {
    return res.status(400).json({
      error: "Erro ao alterar senha",
      details: "As senhas não coincidem."
    });
  }

  try {
    const result = await userPasswordService.setPassword(email, new_password, current_password);
    return res.status(200).json(result);
  } catch (err) {
    return res.status(400).json({
      error: "Erro ao alterar senha",
      details: err.message
    });
  }
};

module.exports = {
  setNewPassword,
  changePassword
};
