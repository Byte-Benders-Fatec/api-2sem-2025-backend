import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
    host: "smtp-mail.outlook.com",
    port: 587,
    secure: false,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
    },
    tls: {
        ciphers: 'SSLv3', // Ajustes de segurança
    },
});

const sendEmail = (email: string, user_password: string): void => {
    transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: email,
        subject: "TEST MAGIC LINK",
        text: `MAGIC LINK: ${user_password}`,
    });
};


export const emailUtils = {
    sendEmail
};