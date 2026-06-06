import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

export interface SignatureReceiptInput {
  contractTitle: string;
  signerName: string;
  signerRole: string;
  signerEmail?: string | null;
  signedAt: Date;
  documentHashAtSign: string;
  flowId: string;
  eventHash?: string | null;
  otpVerified?: boolean;
}

function formatPtBrDate(date: Date): string {
  return date.toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export async function generateSignatureReceiptPdf(input: SignatureReceiptInput): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const page = pdfDoc.addPage([595, 842]);
  const margin = 50;
  let y = 780;
  const lineHeight = 16;

  const draw = (text: string, bold = false, size = 11) => {
    page.drawText(text, {
      x: margin,
      y,
      size,
      font: bold ? fontBold : font,
      color: rgb(0.12, 0.15, 0.2),
    });
    y -= lineHeight;
  };

  page.drawRectangle({
    x: margin,
    y: y - 4,
    width: 32,
    height: 32,
    color: rgb(0.09, 0.47, 1),
    borderRadius: 6,
  });
  page.drawText('F', {
    x: margin + 11,
    y: y + 4,
    size: 18,
    font: fontBold,
    color: rgb(1, 1, 1),
  });
  page.drawText('Fortify', {
    x: margin + 42,
    y: y + 6,
    size: 16,
    font: fontBold,
    color: rgb(0.12, 0.15, 0.2),
  });
  y -= 48;

  draw('Comprovante de Assinatura Eletrônica', true, 14);
  y -= 8;
  draw('Este documento comprova o registro da assinatura abaixo na plataforma Fortify.');
  y -= 12;

  draw('Documento', true);
  draw(input.contractTitle);
  y -= 8;

  draw('Signatário', true);
  draw(`Nome: ${input.signerName}`);
  draw(`Papel: ${input.signerRole}`);
  if (input.signerEmail) {
    draw(`E-mail: ${input.signerEmail}`);
  }
  y -= 8;

  draw('Registro', true);
  draw(`Data e hora: ${formatPtBrDate(input.signedAt)}`);
  draw(`Hash do documento: ${input.documentHashAtSign}`);
  draw(`ID do fluxo: ${input.flowId}`);
  if (input.eventHash) {
    draw(`Referência do evento: ${input.eventHash}`);
  }
  y -= 8;

  draw('Autenticação', true);
  draw(
    input.otpVerified !== false
      ? 'Verificação por e-mail (código OTP)'
      : 'Aceite de termos e revisão do documento',
  );
  y -= 16;

  const footnote =
    'A assinatura eletrônica foi registrada com trilha de auditoria. ' +
    'Guarde este comprovante para fins de comprovação. Fortify — plataforma de contratos e obras.';
  const words = footnote.split(/\s+/);
  let line = '';
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (next.length > 85) {
      draw(line, false, 9);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) draw(line, false, 9);

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

export function receiptFilename(contractTitle: string): string {
  const slug = contractTitle
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40)
    .toLowerCase();
  return `comprovante-assinatura-${slug || 'documento'}.pdf`;
}

export function signedDocumentFilename(contractTitle: string): string {
  const slug = contractTitle
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40)
    .toLowerCase();
  return `documento-assinado-${slug || 'documento'}.pdf`;
}
