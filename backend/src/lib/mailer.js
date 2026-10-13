const nodemailer = require('nodemailer');

let transporter = null;
function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
    });
  }
  return transporter;
}

async function enviarPasswordTemporal(email, passwordTemporal) {
  await getTransporter().sendMail({
    from: `Pura Racha <${process.env.GMAIL_USER}>`,
    to: email,
    subject: 'Tu contraseña temporal — Pura Racha',
    text: `Tu nueva contraseña temporal es: ${passwordTemporal}\n\nIngresá con ella y cambiala desde tu perfil en la app.`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color:#0D1B2A;">Pura Racha</h2>
        <p>Pediste recuperar tu contraseña. Esta es tu nueva contraseña temporal:</p>
        <p style="font-size: 22px; font-weight: 700; letter-spacing: 2px; background:#f0f0f0; padding:12px 16px; border-radius:8px; text-align:center;">
          ${passwordTemporal}
        </p>
        <p>Ingresá a la app con esta contraseña y cambiala desde tu perfil apenas puedas.</p>
        <p style="color:#888; font-size:13px;">Si no pediste este cambio, podés ignorar este email.</p>
      </div>
    `,
  });
}

module.exports = { enviarPasswordTemporal };
