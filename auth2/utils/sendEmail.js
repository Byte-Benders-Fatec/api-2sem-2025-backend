const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com', // ou outro SMTP que você for usar
  port: 587,
  secure: false, // true para 465, false para 587
  auth: {
    user: process.env.EMAIL_USER,     // exemplo: "seuemail@gmail.com"
    pass: process.env.EMAIL_PASS      // app password ou senha gerada
  }
});

/**
 * Envia um e-mail.
 * @param {Object} options - opções de envio
 * @param {string} options.to - destinatário
 * @param {string} options.subject - assunto
 * @param {string} options.text - corpo do e-mail (texto puro)
 */
async function sendEmail({ to, subject, text }) {
  
  if (process.env.SEND_EMAIL === 'true') {
    await transporter.sendMail({
      from: `"Projeto Rural CAR" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      text
    });
  } else {
    console.log(`\nSimulação de envio de e-mail para ${to}:\nAssunto: ${subject}\nTexto: ${text}`);
  }
  
}

module.exports = { sendEmail };
