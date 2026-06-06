import { createHash } from 'crypto';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import type { SignatureFieldPlacement } from './html-to-pdf.js';
import { stripHtml } from './document-hash.js';

export interface SignerEvidence {
  name: string;
  signerName: string;
  signedAt: Date;
  signatureImage?: string | null;
  signatureTyped?: string | null;
  documentHashAtSign?: string | null;
  signatureKey?: string | null;
}

export interface GenerateSignedPdfInput {
  contractTitle: string;
  frozenBodyHtml: string;
  documentHash: string;
  documentPdfHash?: string | null;
  legalTermsVersion: string;
  legalPrivacyVersion: string;
  flowId: string;
  signers: SignerEvidence[];
  eventsSummary: string[];
}

export interface SealSignedPdfInput {
  frozenPdfBuffer: Buffer;
  documentHash: string;
  documentPdfHash: string;
  legalTermsVersion: string;
  legalPrivacyVersion: string;
  flowId: string;
  signers: SignerEvidence[];
  placements: SignatureFieldPlacement[];
  eventsSummary: string[];
}

function wrapText(text: string, maxChars: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (next.length > maxChars) {
      if (line) lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}

async function embedSignatureImage(
  pdfDoc: PDFDocument,
  base64: string,
): Promise<Awaited<ReturnType<PDFDocument['embedPng']>> | null> {
  try {
    const data = base64.replace(/^data:image\/\w+;base64,/, '');
    const bytes = Buffer.from(data, 'base64');
    if (base64.includes('image/jpeg') || base64.includes('image/jpg')) {
      return pdfDoc.embedJpg(bytes);
    }
    return pdfDoc.embedPng(bytes);
  } catch {
    return null;
  }
}

export async function generateSignedPdf(input: GenerateSignedPdfInput): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const bodyText = stripHtml(input.frozenBodyHtml);
  const lines = wrapText(bodyText, 90);

  let page = pdfDoc.addPage([595, 842]);
  let y = 800;
  const margin = 50;
  const lineHeight = 14;

  const drawLine = (text: string, bold = false) => {
    if (y < 60) {
      page = pdfDoc.addPage([595, 842]);
      y = 800;
    }
    page.drawText(text, {
      x: margin,
      y,
      size: 10,
      font: bold ? fontBold : font,
      color: rgb(0.1, 0.1, 0.1),
    });
    y -= lineHeight;
  };

  drawLine(input.contractTitle, true);
  y -= 8;
  for (const line of lines) {
    drawLine(line);
  }

  y -= 20;
  drawLine('Assinaturas', true);
  for (const signer of input.signers) {
    y -= 8;
    drawLine(`${signer.name} — assinado como "${signer.signerName}" em ${signer.signedAt.toISOString()}`);
    if (signer.signatureTyped) {
      drawLine(`Assinatura digitada: ${signer.signatureTyped}`);
    }
    if (signer.signatureImage) {
      const img = await embedSignatureImage(pdfDoc, signer.signatureImage);
      if (img) {
        if (y < 120) {
          page = pdfDoc.addPage([595, 842]);
          y = 800;
        }
        page.drawImage(img, { x: margin, y: y - 60, width: 180, height: 50 });
        y -= 70;
      }
    }
  }

  page = pdfDoc.addPage([595, 842]);
  y = 800;
  drawLine('Certificado de evidências — Fortify', true);
  drawLine(`Fluxo: ${input.flowId}`);
  drawLine(`Hash documento HTML: ${input.documentHash}`);
  if (input.documentPdfHash) {
    drawLine(`Hash PDF congelado: ${input.documentPdfHash}`);
  }
  drawLine(`Termos v${input.legalTermsVersion} · Privacidade v${input.legalPrivacyVersion}`);
  y -= 10;
  drawLine('Timeline resumida:', true);
  for (const ev of input.eventsSummary.slice(0, 30)) {
    drawLine(ev);
  }

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

export async function sealSignedPdf(input: SealSignedPdfInput): Promise<Buffer> {
  const pdfDoc = await PDFDocument.load(input.frozenPdfBuffer);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const pages = pdfDoc.getPages();

  for (const signer of input.signers) {
    const placement = input.placements.find((p) => p.key === signer.signatureKey);
    const pageIndex = placement?.page ?? 0;
    const page = pages[pageIndex] ?? pages[pages.length - 1];
    const x = placement?.x ?? 50;
    const y = placement?.y ?? 100;
    const width = placement?.width ?? 180;
    const height = placement?.height ?? 50;

    if (signer.signatureImage) {
      const img = await embedSignatureImage(pdfDoc, signer.signatureImage);
      if (img) {
        const imgHeight = Math.min(height - 4, 48);
        const imgWidth = Math.min(width - 4, 180);
        page.drawImage(img, { x, y: y + 4, width: imgWidth, height: imgHeight });
      }
    } else if (signer.signatureTyped) {
      page.drawText(signer.signatureTyped, {
        x,
        y: y + height / 2,
        size: 14,
        font,
        color: rgb(0.1, 0.1, 0.4),
      });
    }

    page.drawText(`${signer.signerName} · ${signer.signedAt.toLocaleDateString('pt-BR')}`, {
      x,
      y: Math.max(12, y - 12),
      size: 8,
      font,
      color: rgb(0.3, 0.3, 0.3),
    });
  }

  let evidencePage = pdfDoc.addPage([595, 842]);
  let y = 800;
  const margin = 50;
  const lineHeight = 14;

  const drawLine = (text: string, bold = false) => {
    if (y < 60) {
      evidencePage = pdfDoc.addPage([595, 842]);
      y = 800;
    }
    evidencePage.drawText(text, {
      x: margin,
      y,
      size: 10,
      font: bold ? fontBold : font,
      color: rgb(0.1, 0.1, 0.1),
    });
    y -= lineHeight;
  };

  drawLine('Certificado de evidências — Fortify', true);
  drawLine(`Fluxo: ${input.flowId}`);
  drawLine(`Hash documento HTML: ${input.documentHash}`);
  drawLine(`Hash PDF congelado: ${input.documentPdfHash}`);
  drawLine(`Termos v${input.legalTermsVersion} · Privacidade v${input.legalPrivacyVersion}`);
  y -= 10;
  drawLine('Signatários:', true);
  for (const signer of input.signers) {
    drawLine(
      `${signer.name} — "${signer.signerName}" em ${signer.signedAt.toISOString()} (hash: ${signer.documentHashAtSign ?? 'n/a'})`,
    );
  }
  y -= 10;
  drawLine('Timeline resumida:', true);
  for (const ev of input.eventsSummary.slice(0, 30)) {
    drawLine(ev);
  }

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

export function hashPdfBuffer(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex');
}
