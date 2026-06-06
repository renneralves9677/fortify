import type { Request } from 'express';
import { ContractSignerStatus, type SignatureChannel } from '@prisma/client';
import { AppError } from '../../core/errors/AppError.js';
import { sendMail, type MailAttachment } from '../../core/email/mailer.js';
import { sanitizeHtml } from '../../domain/contracts/html-sanitizer.js';
import {
  renderDocumentForDisplay,
  signatureKeyFromRole,
} from '../../domain/contracts/template-renderer.js';
import type { SignatureFieldPlacement } from '../../domain/signatures/html-to-pdf.js';
import type { SignaturesRepositoryPort } from './signatures.repository.port.js';

export const uploadDir = process.env.UPLOAD_DIR ?? './uploads';

interface EmailPayload {
  subject: string;
  html: string;
}

export async function deliverWhatsapp(recipient: string, text: string) {
  console.log(`[SIGNATURE_LINK] canal=WHATSAPP destinatario=${recipient} url=${text}`);
  if (process.env.WHATSAPP_MOCK === 'true') {
    console.log(`[MOCK WHATSAPP] Fortify → ${recipient}: ${text}`);
  }
}

export function publicApiBase(): string {
  const configured = process.env.PUBLIC_API_URL?.trim() || process.env.API_PUBLIC_URL?.trim();
  if (configured) return configured.replace(/\/$/, '');
  return 'http://localhost:3001/api';
}

export function signerEmailAddress(signer: {
  channel: SignatureChannel;
  recipient: string;
  email?: string | null;
}): string | undefined {
  const direct = signer.email?.trim();
  if (direct) return direct;
  if (signer.channel === 'EMAIL') return signer.recipient.trim() || undefined;
  return undefined;
}

export async function deliverEmail(
  recipient: string,
  email: EmailPayload,
  attachments?: MailAttachment[],
) {
  console.log(`[SIGNATURE_LINK] canal=EMAIL destinatario=${recipient} assunto=${email.subject}`);
  await sendMail({ to: recipient, subject: email.subject, html: email.html, attachments });
}

export async function notifySigner(
  signer: {
    channel: SignatureChannel;
    recipient: string;
    email?: string | null;
    phone?: string | null;
  },
  payload: { text: string; email: EmailPayload },
) {
  const email = signer.email?.trim() || (signer.channel === 'EMAIL' ? signer.recipient : undefined);
  const phone = signer.phone?.trim() || (signer.channel === 'WHATSAPP' ? signer.recipient : undefined);

  if (signer.channel === 'EMAIL' || signer.channel === 'AMBOS') {
    const to = email ?? signer.recipient;
    if (to) await deliverEmail(to, payload.email);
  }
  if (signer.channel === 'WHATSAPP' || signer.channel === 'AMBOS') {
    const to = phone ?? signer.recipient;
    if (to) await deliverWhatsapp(to, payload.text);
  }
}

export function getRequestMeta(req: Request) {
  const ip =
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ?? req.socket.remoteAddress;
  const userAgent = req.headers['user-agent'] ?? undefined;
  return { ip, userAgent };
}

export function maskIp(ip?: string | null) {
  if (!ip) return null;
  if (ip.includes('.')) {
    const parts = ip.split('.');
    return `${parts[0]}.${parts[1]}.***.***`;
  }
  return `${ip.slice(0, 8)}***`;
}

export function serializeSigner(s: {
  id: string;
  signOrder: number;
  role: string;
  name: string;
  status: ContractSignerStatus;
  token: string;
  recipient: string;
  channel: SignatureChannel;
  sentAt: Date | null;
  viewedAt: Date | null;
  consentAt: Date | null;
  signedAt: Date | null;
  expiresAt: Date | null;
  signerName: string | null;
}) {
  const webUrl = process.env.WEB_URL ?? 'http://localhost:5173';
  return {
    id: s.id,
    signOrder: s.signOrder,
    role: s.role,
    name: s.name,
    status: s.status,
    recipient: s.recipient,
    channel: s.channel,
    sentAt: s.sentAt,
    viewedAt: s.viewedAt,
    consentAt: s.consentAt,
    signedAt: s.signedAt,
    expiresAt: s.expiresAt,
    signerName: s.signerName,
    signUrl: `${webUrl}/assinatura/${s.token}`,
  };
}

export function flowDisplayHtml(
  flow: {
    frozenBodyHtml: string;
    signers: Array<{
      role: string;
      status: ContractSignerStatus;
      signerName: string | null;
      signatureImage: string | null;
      signatureTyped: string | null;
      signedAt: Date | null;
    }>;
    contract?: {
      template?: { fields?: Array<{ key: string; label: string; fieldType: string; required: boolean }> } | null;
    } | null;
  },
) {
  const templateFields = flow.contract?.template?.fields ?? [];
  return sanitizeHtml(
    renderDocumentForDisplay(
      flow.frozenBodyHtml,
      flow.signers.map((s) => ({
        role: s.role,
        status: s.status,
        signerName: s.signerName,
        signatureImage: s.signatureImage,
        signatureTyped: s.signatureTyped,
        signedAt: s.signedAt,
      })),
      templateFields,
    ),
  );
}

export function parsePlacements(raw: unknown): SignatureFieldPlacement[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (p): p is SignatureFieldPlacement =>
      typeof p === 'object' &&
      p !== null &&
      typeof (p as SignatureFieldPlacement).key === 'string',
  );
}

export function buildSignatureFields(
  flow: {
    signatureFieldPlacements: unknown;
    signers: Array<{
      role: string;
      status: ContractSignerStatus;
      signatureImage: string | null;
      signatureTyped: string | null;
      signerName: string | null;
      signedAt: Date | null;
    }>;
  },
  templateFields: Array<{ key: string; fieldType: string }>,
) {
  const placements = parsePlacements(flow.signatureFieldPlacements);
  const signatureFields = templateFields.filter((f) => f.fieldType === 'signature');
  return signatureFields.map((field) => {
    const placement = placements.find((p) => p.key === field.key);
    const signer = flow.signers.find((s) => signatureKeyFromRole(s.role) === field.key);
    return {
      key: field.key,
      role: signer?.role ?? field.key.replace('ASSINATURA_', ''),
      status: signer?.status ?? 'WAITING',
      page: placement?.page ?? 0,
      x: placement?.x ?? 50,
      y: placement?.y ?? 100,
      width: placement?.width ?? 200,
      height: placement?.height ?? 60,
      signed: signer?.status === ContractSignerStatus.SIGNED,
      signatureImage: signer?.signatureImage ?? null,
      signatureTyped: signer?.signatureTyped ?? null,
      signerName: signer?.signerName ?? null,
    };
  });
}

export function serializeFlow(
  flow: NonNullable<Awaited<ReturnType<SignaturesRepositoryPort['findFlowByIdForCompany']>>>,
) {
  return {
    id: flow.id,
    contractId: flow.contractId,
    status: flow.status,
    documentHash: flow.documentHash,
    documentPdfHash: flow.documentPdfHash,
    pdfMode: !!flow.documentPdfHash,
    legalTermsVersion: flow.legalTermsVersion,
    legalPrivacyVersion: flow.legalPrivacyVersion,
    startedAt: flow.startedAt,
    completedAt: flow.completedAt,
    contract: flow.contract,
    displayHtml: flowDisplayHtml(flow),
    signers: flow.signers.map(serializeSigner),
    documents: flow.documents,
  };
}

export function serializeEvent(ev: {
  id: string;
  eventType: string;
  metadata: unknown;
  ip: string | null;
  userAgent: string | null;
  eventHash: string;
  createdAt: Date;
  signer?: { name: string } | null;
}) {
  return {
    id: ev.id,
    eventType: ev.eventType,
    metadata: ev.metadata,
    ip: maskIp(ev.ip),
    userAgent: ev.userAgent,
    eventHash: ev.eventHash,
    createdAt: ev.createdAt,
    signerName: ev.signer?.name ?? null,
  };
}

export function assertSignerActive(signer: {
  status: ContractSignerStatus;
  expiresAt: Date | null;
}) {
  if (signer.expiresAt && signer.expiresAt < new Date()) {
    throw new AppError(404, 'Link inválido ou expirado', 'SIGNATURE_LINK_INVALID');
  }
  if (signer.status === ContractSignerStatus.WAITING) {
    throw new AppError(403, 'Aguardando assinatura de parte anterior', 'SIGNATURE_NOT_YOUR_TURN');
  }
  if (signer.status === ContractSignerStatus.SIGNED) {
    throw new AppError(400, 'Assinatura já concluída', 'SIGNATURE_ALREADY_DONE');
  }
  if (signer.status === ContractSignerStatus.EXPIRED) {
    throw new AppError(404, 'Link inválido ou expirado', 'SIGNATURE_LINK_INVALID');
  }
}
