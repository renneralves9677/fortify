interface LayoutOptions {
  title: string;
  intro: string;
  body: string;
  footnote?: string;
}

const BRAND = '#1f6feb';

function layout({ title, intro, body, footnote }: LayoutOptions): string {
  return `<!doctype html>
<html lang="pt-BR">
  <body style="margin:0;background:#f5f6f7;font-family:Inter,Arial,Helvetica,sans-serif;color:#1f2733;">
    <div style="max-width:520px;margin:0 auto;padding:32px 16px;">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:24px;">
        <span style="display:inline-flex;width:32px;height:32px;border-radius:8px;background:${BRAND};color:#fff;align-items:center;justify-content:center;font-weight:700;">F</span>
        <span style="font-size:18px;font-weight:600;">Fortify</span>
      </div>
      <div style="background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;padding:28px;">
        <h1 style="margin:0 0 8px;font-size:20px;">${title}</h1>
        <p style="margin:0 0 20px;color:#52606d;font-size:14px;line-height:22px;">${intro}</p>
        ${body}
      </div>
      <p style="margin:20px 0 0;color:#8a97a6;font-size:12px;line-height:18px;text-align:center;">
        ${footnote ?? 'Você recebeu este e-mail porque uma ação foi solicitada na plataforma Fortify.'}
      </p>
    </div>
  </body>
</html>`;
}

function codeBlock(code: string): string {
  return `<div style="margin:8px 0 20px;padding:16px;border-radius:8px;background:#f0f5ff;text-align:center;">
    <span style="font-size:30px;font-weight:700;letter-spacing:8px;color:${BRAND};">${code}</span>
  </div>`;
}

function button(url: string, label: string): string {
  return `<div style="margin:8px 0 4px;">
    <a href="${url}" style="display:inline-block;background:${BRAND};color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:6px;font-size:14px;font-weight:600;">${label}</a>
  </div>
  <p style="margin:16px 0 0;color:#8a97a6;font-size:12px;word-break:break-all;">${url}</p>`;
}

export function signupCodeEmail(name: string, code: string) {
  return {
    subject: 'Seu código de confirmação Fortify',
    html: layout({
      title: 'Confirme seu e-mail',
      intro: `Olá ${name}, use o código abaixo para concluir a criação da sua conta. Ele expira em 15 minutos.`,
      body: codeBlock(code),
      footnote: 'Se você não solicitou esta conta, ignore este e-mail.',
    }),
  };
}

export function resetCodeEmail(code: string) {
  return {
    subject: 'Código para redefinir sua senha',
    html: layout({
      title: 'Recuperação de senha',
      intro: 'Use o código abaixo para validar sua identidade. Ele expira em 15 minutos.',
      body: codeBlock(code),
      footnote: 'Se você não solicitou a redefinição, ignore este e-mail.',
    }),
  };
}

export function resetLinkEmail(url: string) {
  return {
    subject: 'Link para definir uma nova senha',
    html: layout({
      title: 'Defina sua nova senha',
      intro: 'Identidade confirmada. Clique no botão abaixo para criar uma nova senha. O link expira em 30 minutos.',
      body: button(url, 'Definir nova senha'),
      footnote: 'Se você não solicitou a redefinição, ignore este e-mail.',
    }),
  };
}

export function signatureOtpEmail(code: string) {
  return {
    subject: 'Código de verificação para assinatura',
    html: layout({
      title: 'Verificação de identidade',
      intro: 'Use o código abaixo para verificar sua identidade e concluir a assinatura. Ele expira em 10 minutos.',
      body: codeBlock(code),
    }),
  };
}

export function signatureLinkEmail(contractTitle: string, url: string) {
  return {
    subject: `Assinatura solicitada — ${contractTitle}`,
    html: layout({
      title: 'Documento para assinatura',
      intro: `Você foi convidado a assinar o documento "${contractTitle}". Clique no botão abaixo para revisar e assinar.`,
      body: button(url, 'Revisar e assinar'),
    }),
  };
}

function formatSignedAt(signedAt: Date): string {
  return signedAt.toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function signatureReceiptEmail(params: {
  contractTitle: string;
  signerName: string;
  signedAt: Date;
  receiptUrl?: string;
}) {
  const bodyParts = [
    `<p style="margin:0 0 12px;color:#52606d;font-size:14px;line-height:22px;">`,
    `Sua assinatura no documento <strong>${params.contractTitle}</strong> foi registrada com sucesso `,
    `em ${formatSignedAt(params.signedAt)}.`,
    `</p>`,
    `<p style="margin:0;color:#52606d;font-size:14px;line-height:22px;">`,
    `O comprovante de assinatura eletrônica está em anexo neste e-mail.`,
    `</p>`,
  ];
  if (params.receiptUrl) {
    bodyParts.push(button(params.receiptUrl, 'Baixar comprovante'));
  }
  return {
    subject: `Assinatura confirmada — ${params.contractTitle}`,
    html: layout({
      title: 'Assinatura registrada',
      intro: `Olá ${params.signerName}, obrigado por assinar.`,
      body: bodyParts.join(''),
      footnote: 'Guarde o comprovante em anexo para seus registros.',
    }),
  };
}

export function signatureCompletedEmail(params: {
  contractTitle: string;
  signerName: string;
  signedPdfUrl?: string;
}) {
  const bodyParts = [
    `<p style="margin:0 0 12px;color:#52606d;font-size:14px;line-height:22px;">`,
    `Todas as partes assinaram o documento <strong>${params.contractTitle}</strong>. `,
    `O processo de assinatura foi concluído.`,
    `</p>`,
    `<p style="margin:0;color:#52606d;font-size:14px;line-height:22px;">`,
    `O documento final assinado está em anexo neste e-mail.`,
    `</p>`,
  ];
  if (params.signedPdfUrl) {
    bodyParts.push(button(params.signedPdfUrl, 'Baixar documento assinado'));
  }
  return {
    subject: `Documento assinado — ${params.contractTitle}`,
    html: layout({
      title: 'Assinatura concluída',
      intro: `Olá ${params.signerName}, o documento está finalizado.`,
      body: bodyParts.join(''),
      footnote: 'Este e-mail contém o PDF final com todas as assinaturas.',
    }),
  };
}
