import 'dotenv/config';
import { sendMail } from '../src/core/email/mailer.js';

const to = process.argv[2] ?? process.env.SMTP_USER;
if (!to) {
  console.error('Uso: npx tsx scripts/test-smtp.ts [destinatario]');
  process.exit(1);
}

const result = await sendMail({
  to,
  subject: 'Teste SMTP Fortify',
  html: '<p>Se você recebeu este e-mail, o SMTP está configurado corretamente.</p>',
});
console.log(result.sent ? 'Enviado com sucesso' : 'Falha no envio');
process.exit(result.sent ? 0 : 1);
