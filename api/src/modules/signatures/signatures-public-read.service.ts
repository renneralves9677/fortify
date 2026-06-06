import type { Request } from 'express';
import fs from 'fs';
import { ContractSignerStatus, SignatureFlowStatus, SignatureStatus } from '@prisma/client';
import { AppError } from '../../core/errors/AppError.js';
import { getLegalConfig } from '../../core/config/legal.js';
import { sanitizeHtml } from '../../domain/contracts/html-sanitizer.js';
import { signatureKeyFromRole } from '../../domain/contracts/template-renderer.js';
import { receiptFilename, signedDocumentFilename } from '../../domain/signatures/signature-receipt-pdf.js';
import type { SignaturesRepositoryPort } from './signatures.repository.port.js';
import type { SignaturesDocumentsService } from './signatures-documents.service.js';
import { buildSignatureFields, flowDisplayHtml, getRequestMeta } from './signatures-shared.js';

export class SignaturesPublicReadService {
  constructor(
    private readonly repo: SignaturesRepositoryPort,
    private readonly documents: SignaturesDocumentsService,
  ) {}

  async getPublicSignature(token: string, req: Request) {
    const signer = await this.repo.findSignerByToken(token);
    if (signer) {
      return this.getPublicFlowSignature(signer, req);
    }

    const request = await this.repo.findByToken(token);
    if (
      !request ||
      request.status === SignatureStatus.EXPIRADO ||
      request.expiresAt < new Date()
    ) {
      throw new AppError(404, 'Link inválido ou expirado', 'SIGNATURE_LINK_INVALID');
    }
    return {
      legacy: true,
      token: request.token,
      status: request.status,
      contract: {
        title: request.contract.title,
        partyName: request.contract.partyName,
        html: sanitizeHtml(request.contract.bodyHtml),
      },
    };
  }

  private async getPublicFlowSignature(
    signer: NonNullable<Awaited<ReturnType<SignaturesRepositoryPort['findSignerByToken']>>>,
    req: Request,
  ) {
    const { ip, userAgent } = getRequestMeta(req);
    const flow = signer.flow;

    if (flow.status === SignatureFlowStatus.CANCELLED || flow.status === SignatureFlowStatus.EXPIRED) {
      throw new AppError(404, 'Link inválido ou expirado', 'SIGNATURE_LINK_INVALID');
    }

    if (signer.status === ContractSignerStatus.WAITING) {
      const pending = flow.signers.find(
        (s) => s.status === ContractSignerStatus.PENDING || s.status === ContractSignerStatus.VIEWED,
      );
      throw new AppError(
        403,
        `Aguardando assinatura de ${pending?.name ?? 'outra parte'}`,
        'SIGNATURE_NOT_YOUR_TURN',
      );
    }

    if (
      signer.status !== ContractSignerStatus.SIGNED &&
      signer.expiresAt &&
      signer.expiresAt < new Date()
    ) {
      throw new AppError(404, 'Link inválido ou expirado', 'SIGNATURE_LINK_INVALID');
    }

    if (signer.status === ContractSignerStatus.PENDING) {
      await this.repo.markSignerViewed(signer.id, flow.id, ip, userAgent);
    }

    const legal = getLegalConfig();
    const displayHtml = flowDisplayHtml(flow);
    const signatureKey = signatureKeyFromRole(signer.role);
    const canSign =
      signer.status === ContractSignerStatus.PENDING ||
      signer.status === ContractSignerStatus.VIEWED;

    const templateFields = flow.contract.template?.fields ?? [];
    const pdfMode = !!flow.documentPdfHash;
    const signatureFields = pdfMode ? buildSignatureFields(flow, templateFields) : undefined;

    return {
      legacy: false,
      token: signer.token,
      status: signer.status,
      canSign,
      pdfMode,
      documentHash: flow.documentHash,
      documentPdfHash: flow.documentPdfHash,
      legalTermsVersion: legal.termsVersion,
      legalPrivacyVersion: legal.privacyVersion,
      flowStatus: flow.status,
      contract: {
        title: flow.contract.title,
        partyName: flow.contract.partyName,
        html: pdfMode ? undefined : displayHtml,
      },
      pdfUrl: pdfMode ? `/signatures/public/${signer.token}/pdf` : undefined,
      signatureFields,
      signers: flow.signers.map((s) => ({
        signOrder: s.signOrder,
        name: s.name,
        role: s.role,
        status:
          s.id === signer.id && s.status === ContractSignerStatus.PENDING
            ? ContractSignerStatus.VIEWED
            : s.status,
      })),
      currentSigner: {
        name: signer.name,
        role: signer.role,
        signatureKey,
      },
      otpRequired: process.env.SIGNATURE_OTP_REQUIRED !== 'false',
      otpVerified: !!(await this.repo.hasVerifiedOtp(signer.id)),
    };
  }

  async getPublicFrozenPdf(token: string) {
    const signer = await this.repo.findSignerByTokenWithDocuments(token);
    if (!signer?.flow.documentPdfHash) {
      throw new AppError(404, 'PDF não disponível', 'FROZEN_PDF_NOT_FOUND');
    }
    if (
      signer.status === ContractSignerStatus.WAITING ||
      signer.status === ContractSignerStatus.EXPIRED
    ) {
      throw new AppError(403, 'Link indisponível', 'SIGNATURE_NOT_YOUR_TURN');
    }
    const frozenDoc = signer.flow.documents.find((d) => d.type === 'FROZEN_PDF');
    if (!frozenDoc) {
      throw new AppError(404, 'PDF não encontrado', 'FROZEN_PDF_NOT_FOUND');
    }
    const upload = await this.repo.findUploadById(
      frozenDoc.uploadId,
      signer.flow.contract.companyId,
    );
    if (!upload || !fs.existsSync(upload.path)) {
      throw new AppError(404, 'Arquivo não encontrado', 'FROZEN_PDF_NOT_FOUND');
    }
    return {
      buffer: fs.readFileSync(upload.path),
      contentHash: frozenDoc.contentHash,
      filename: upload.filename,
    };
  }

  async getPublicReceipt(token: string) {
    const signer = await this.repo.findSignerByToken(token);
    if (!signer || signer.status !== ContractSignerStatus.SIGNED) {
      throw new AppError(404, 'Comprovante não disponível', 'RECEIPT_NOT_FOUND');
    }
    const appliedEvent = await this.repo.findSignatureAppliedEvent(signer.flowId, signer.id);
    const buffer = await this.documents.buildReceiptPdfForSigner(signer, appliedEvent?.eventHash);
    return {
      buffer,
      filename: receiptFilename(signer.flow.contract.title),
    };
  }

  async getPublicSignedPdf(token: string) {
    const signer = await this.repo.findSignerByTokenWithDocuments(token);
    if (!signer) {
      throw new AppError(404, 'Documento não disponível', 'SIGNED_PDF_NOT_FOUND');
    }
    if (signer.status !== ContractSignerStatus.SIGNED) {
      throw new AppError(403, 'Assinatura pendente', 'SIGNATURE_PENDING');
    }
    if (signer.flow.status !== SignatureFlowStatus.COMPLETED) {
      throw new AppError(403, 'Documento ainda não finalizado', 'FLOW_NOT_COMPLETED');
    }
    const signedDoc = signer.flow.documents.find((d) => d.type === 'SIGNED_PDF');
    if (!signedDoc) {
      throw new AppError(404, 'Documento assinado não encontrado', 'SIGNED_PDF_NOT_FOUND');
    }
    const upload = await this.repo.findUploadById(
      signedDoc.uploadId,
      signer.flow.contract.companyId,
    );
    if (!upload || !fs.existsSync(upload.path)) {
      throw new AppError(404, 'Arquivo não encontrado', 'SIGNED_PDF_NOT_FOUND');
    }
    return {
      buffer: fs.readFileSync(upload.path),
      filename: signedDocumentFilename(signer.flow.contract.title),
      contentHash: signedDoc.contentHash,
    };
  }
}
