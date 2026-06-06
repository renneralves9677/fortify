import nodemailer, { type Transporter } from 'nodemailer';

export interface MailAttachment {
  filename: string;
  content: Buffer;
}

export interface SendMailInput {
  to: string;
  subject: string;
  html: string;
  text?: string;
  attachments?: MailAttachment[];
}

let cachedTransport: Transporter | null = null;
let usingSmtp = false;

/**
 * Lazily builds the transport. With SMTP_HOST set, uses real SMTP.
 * Otherwise falls back to a JSON transport that only logs to the console,
 * so signup / reset / signature flows stay testable without credentials.
 */
function getTransport(): Transporter {
  if (cachedTransport) return cachedTransport;

  const host = process.env.SMTP_HOST?.trim();
  if (host) {
    usingSmtp = true;
    const port = Number(process.env.SMTP_PORT ?? 587);
    cachedTransport = nodemailer.createTransport({
      host,
      port,
      secure: process.env.SMTP_SECURE === 'true',
      requireTLS: port === 587,
      auth:
        process.env.SMTP_USER && process.env.SMTP_PASS
          ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
          : undefined,
    });
  } else {
    usingSmtp = false;
    cachedTransport = nodemailer.createTransport({ jsonTransport: true });
  }
  return cachedTransport;
}

function defaultFrom(): string {
  const from = process.env.SMTP_FROM?.trim() || process.env.MAIL_FROM?.trim();
  if (!from) return 'Fortify <nao-responder@fortify.local>';
  if (from.includes('<')) return from;
  return `Fortify <${from}>`;
}

/**
 * Sends an e-mail. Never throws to callers — failures are logged so the
 * surrounding business flow (signup, reset, signature) is not interrupted.
 */
export async function sendMail(input: SendMailInput): Promise<{ sent: boolean }> {
  const transport = getTransport();
  try {
    await transport.sendMail({
      from: defaultFrom(),
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text ?? input.html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(),
      attachments: input.attachments?.map((a) => ({
        filename: a.filename,
        content: a.content,
      })),
    });
    if (usingSmtp) {
      console.log(`[EMAIL] enviado via SMTP -> ${input.to} :: ${input.subject}`);
    } else {
      console.log(`[MOCK EMAIL] -> ${input.to} :: ${input.subject}`);
    }
    return { sent: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[EMAIL] falha ao enviar para ${input.to}: ${message}`);
    return { sent: false };
  }
}
