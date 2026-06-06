import type { Request } from 'express';
import fs from 'fs';
import { ContractSignerStatus, SignatureFlowMode, SignatureStatus } from '@prisma/client';
import { AppError } from '../../core/errors/AppError.js';
import { getLegalConfig } from '../../core/config/legal.js';
import { withPrismaError } from '../../core/errors/prisma-mapper.js';
import { hashDocument } from '../../domain/signatures/document-hash.js';
import { buildWhatsappSignatureLinkMessage } from '../../domain/signatures/whatsapp-signature.js';
import { signatureLinkEmail, signatureOtpEmail } from '../../core/email/templates.js';
import { hashPdfBuffer } from '../../domain/signatures/signed-document-pdf.js';
import type {
  ConsentPublicInput,
  SignFlowPublicInput,
  SignPublicInput,
} from './signatures.schema.js';
import type { SignaturesRepositoryPort } from './signatures.repository.port.js';
import type { SignaturesDocumentsService } from './signatures-documents.service.js';
import {
  assertSignerActive,
  flowDisplayHtml,
  getRequestMeta,
  notifySigner,
} from './signatures-shared.js';

export class SignaturesPublicActionService {
  constructor(
    private readonly repo: SignaturesRepositoryPort,
    private readonly documents: SignaturesDocumentsService,
  ) {}

  async consentPublic(token: string, input: ConsentPublicInput, req: Request) {
    const signer = await this.repo.findSignerByToken(token);
    if (!signer) {
      throw new AppError(404, 'Link inválido', 'SIGNATURE_LINK_INVALID');
    }

    assertSignerActive(signer);
    if (process.env.SIGNATURE_OTP_REQUIRED !== 'false') {
      const verified = await this.repo.hasVerifiedOtp(signer.id);
      if (!verified) {
        throw new AppError(400, 'Verificação OTP pendente', 'OTP_REQUIRED');
      }
    }
    const legal = getLegalConfig();
    if (
      input.termsVersion !== legal.termsVersion ||
      input.privacyVersion !== legal.privacyVersion
    ) {
      throw new AppError(400, 'Versão legal desatualizada', 'LEGAL_VERSION_MISMATCH');
    }

    const { ip, userAgent } = getRequestMeta(req);
    await this.repo.recordConsent(signer.id, signer.flowId, ip, userAgent);
    return { success: true };
  }

  async sendOtpPublic(token: string) {
    const signer = await this.repo.findSignerByToken(token);
    if (!signer) {
      throw new AppError(404, 'Link inválido', 'SIGNATURE_LINK_INVALID');
    }
    assertSignerActive(signer);

    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await this.repo.createSignerOtp(signer.id, code, expiresAt);
    await notifySigner(signer, {
      text: `Código OTP Fortify: ${code}`,
      email: signatureOtpEmail(code),
    });
    return {
      success: true,
      expiresAt,
      maskedRecipient: signer.recipient.replace(/(.{2}).+(@?.+)/, '$1***$2'),
    };
  }

  async verifyOtpPublic(token: string, code: string) {
    const signer = await this.repo.findSignerByToken(token);
    if (!signer) {
      throw new AppError(404, 'Link inválido', 'SIGNATURE_LINK_INVALID');
    }
    assertSignerActive(signer);

    const otp = await this.repo.findLatestOtp(signer.id);
    if (!otp || otp.expiresAt < new Date() || otp.verifiedAt) {
      throw new AppError(400, 'Código OTP inválido ou expirado', 'OTP_INVALID');
    }
    if (otp.code !== code) {
      throw new AppError(400, 'Código OTP incorreto', 'OTP_MISMATCH');
    }
    await this.repo.markOtpVerified(otp.id);
    return { success: true };
  }

  async signPublicContract(token: string, _input: SignPublicInput) {
    const request = await this.repo.findByToken(token);
    if (!request || request.status !== SignatureStatus.PENDENTE) {
      throw new AppError(400, 'Assinatura indisponível', 'SIGNATURE_UNAVAILABLE');
    }

    await withPrismaError(() =>
      this.repo.signContractTransaction(request.id, request.contractId),
    );

    return { success: true, message: 'Contrato assinado com sucesso' };
  }

  async signFlowPublic(token: string, input: SignFlowPublicInput, req: Request) {
    const signer = await this.repo.findSignerByToken(token);
    if (!signer) {
      throw new AppError(404, 'Link inválido', 'SIGNATURE_LINK_INVALID');
    }

    assertSignerActive(signer);
    if (!signer.consentAt) {
      throw new AppError(400, 'Consentimento não registrado', 'CONSENT_REQUIRED');
    }

    const flow = signer.flow;
    const currentHash = hashDocument(flow.frozenBodyHtml);
    if (currentHash !== flow.documentHash) {
      throw new AppError(400, 'Integridade do documento comprometida', 'DOCUMENT_HASH_MISMATCH');
    }
    if (flow.documentPdfHash) {
      const frozenDoc = await this.repo.findFrozenDocument(flow.id);
      if (!frozenDoc) {
        throw new AppError(400, 'PDF congelado não encontrado', 'FROZEN_PDF_NOT_FOUND');
      }
      const upload = await this.repo.findUploadById(frozenDoc.uploadId, flow.contract.companyId);
      if (!upload || !fs.existsSync(upload.path)) {
        throw new AppError(400, 'Arquivo PDF congelado indisponível', 'FROZEN_PDF_NOT_FOUND');
      }
      const frozenBuffer = fs.readFileSync(upload.path);
      if (hashPdfBuffer(frozenBuffer) !== flow.documentPdfHash) {
        throw new AppError(400, 'Integridade do PDF comprometida', 'DOCUMENT_PDF_HASH_MISMATCH');
      }
    }

    const sorted = [...flow.signers].sort((a, b) => a.signOrder - b.signOrder);
    const idx = sorted.findIndex((s) => s.id === signer.id);
    const parallel = flow.signMode === SignatureFlowMode.PARALLEL;
    const remaining = sorted.filter(
      (s) => s.id !== signer.id && s.status !== ContractSignerStatus.SIGNED,
    );
    const isLast = parallel ? remaining.length === 0 : idx === sorted.length - 1;
    const next = parallel ? undefined : sorted[idx + 1];
    const { ip, userAgent } = getRequestMeta(req);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const hashAtSign = flow.documentPdfHash ?? flow.documentHash;
    const updatedFlow = await this.repo.applySignature({
      signerId: signer.id,
      flowId: flow.id,
      contractId: flow.contractId,
      documentHash: hashAtSign,
      signerName: input.signerName,
      signatureImage: input.signatureImage,
      signatureTyped: input.signatureTyped,
      ip,
      userAgent,
      isLastSigner: isLast,
      nextSignerId: next?.id,
      nextExpiresAt: next ? expiresAt : undefined,
    });

    if (next) {
      const link = `${process.env.WEB_URL ?? 'http://localhost:5173'}/assinatura/${next.token}`;
      await this.repo.recordEvent({
        flowId: flow.id,
        signerId: next.id,
        eventType: 'LINK_SENT',
        metadata: { recipient: next.recipient, signUrl: link },
      });
      await notifySigner(next, {
        text: buildWhatsappSignatureLinkMessage(flow.contract.title, link),
        email: signatureLinkEmail(flow.contract.title, link),
      });
    }

    const signedAt = new Date();
    const appliedEvent = updatedFlow.events.find(
      (e) => e.signerId === signer.id && e.eventType === 'SIGNATURE_APPLIED',
    );
    const receiptEmailSent = await this.documents.sendSignerReceiptEmail({
      signer,
      contractTitle: flow.contract.title,
      signerName: input.signerName,
      signedAt,
      documentHashAtSign: hashAtSign,
      flowId: flow.id,
      eventHash: appliedEvent?.eventHash ?? null,
    });

    let flowCompletedEmailSent = false;
    if (isLast) {
      const { pdfBuffer } = await this.documents.generateAndStorePdf(
        updatedFlow,
        flow.contract.companyId,
      );
      flowCompletedEmailSent = await this.documents.sendFlowCompletedEmails(
        updatedFlow,
        flow.contract.title,
        pdfBuffer,
      );
    }

    const refreshedFlow = await this.repo.findSignerByToken(token);
    const displayHtml = refreshedFlow ? flowDisplayHtml(refreshedFlow.flow) : undefined;

    return {
      success: true,
      message: 'Assinatura registrada com sucesso',
      flowCompleted: isLast,
      receiptEmailSent,
      flowCompletedEmailSent: isLast ? flowCompletedEmailSent : false,
      displayHtml,
    };
  }
}
