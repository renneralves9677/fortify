import fs from 'fs';
import path from 'path';
import { v4 as uuid } from 'uuid';
import type { SignatureChannel } from '@prisma/client';
import { AppError } from '../../core/errors/AppError.js';
import { type MailAttachment } from '../../core/email/mailer.js';
import {
  signatureCompletedEmail,
  signatureReceiptEmail,
} from '../../core/email/templates.js';
import { signatureKeyFromRole } from '../../domain/contracts/template-renderer.js';
import {
  generateSignatureReceiptPdf,
  receiptFilename,
  signedDocumentFilename,
} from '../../domain/signatures/signature-receipt-pdf.js';
import {
  generateSignedPdf,
  hashPdfBuffer,
  sealSignedPdf,
  type SignerEvidence,
} from '../../domain/signatures/signed-document-pdf.js';
import type { SignaturesRepositoryPort } from './signatures.repository.port.js';
import {
  deliverEmail,
  deliverWhatsapp,
  parsePlacements,
  publicApiBase,
  signerEmailAddress,
  uploadDir,
} from './signatures-shared.js';

export class SignaturesDocumentsService {
  constructor(private readonly repo: SignaturesRepositoryPort) {}

  getContractHistory(contractId: string, companyId: string) {
    return this.repo.findHistoryForContract(contractId, companyId);
  }

  async getSignedDocument(contractId: string, companyId: string) {
    const doc = await this.repo.findSignedDocument(contractId, companyId);
    if (!doc) {
      throw new AppError(404, 'Documento assinado não encontrado', 'SIGNED_DOCUMENT_NOT_FOUND');
    }
    const upload = await this.repo.findUploadById(doc.uploadId, companyId);
    if (!upload) {
      throw new AppError(404, 'Arquivo não encontrado', 'UPLOAD_NOT_FOUND');
    }
    return { document: doc, upload };
  }

  async buildReceiptPdfForSigner(
    signer: {
      name: string;
      role: string;
      email?: string | null;
      token: string;
      signerName?: string | null;
      signedAt?: Date | null;
      documentHashAtSign?: string | null;
      flow: { id: string; contract: { title: string } };
    },
    eventHash?: string | null,
  ): Promise<Buffer> {
    return generateSignatureReceiptPdf({
      contractTitle: signer.flow.contract.title,
      signerName: signer.signerName ?? signer.name,
      signerRole: signer.role,
      signerEmail: signer.email,
      signedAt: signer.signedAt ?? new Date(),
      documentHashAtSign: signer.documentHashAtSign ?? '',
      flowId: signer.flow.id,
      eventHash,
      otpVerified: process.env.SIGNATURE_OTP_REQUIRED !== 'false',
    });
  }

  async sendSignerReceiptEmail(params: {
    signer: {
      id: string;
      token: string;
      name: string;
      role: string;
      channel: SignatureChannel;
      recipient: string;
      email?: string | null;
      phone?: string | null;
    };
    contractTitle: string;
    signerName: string;
    signedAt: Date;
    documentHashAtSign: string;
    flowId: string;
    eventHash?: string | null;
  }): Promise<boolean> {
    const receiptBuffer = await generateSignatureReceiptPdf({
      contractTitle: params.contractTitle,
      signerName: params.signerName,
      signerRole: params.signer.role,
      signerEmail: params.signer.email,
      signedAt: params.signedAt,
      documentHashAtSign: params.documentHashAtSign,
      flowId: params.flowId,
      eventHash: params.eventHash,
      otpVerified: process.env.SIGNATURE_OTP_REQUIRED !== 'false',
    });
    const attachment: MailAttachment = {
      filename: receiptFilename(params.contractTitle),
      content: receiptBuffer,
    };
    const receiptUrl = `${publicApiBase()}/signatures/public/${params.signer.token}/receipt`;
    const emailPayload = signatureReceiptEmail({
      contractTitle: params.contractTitle,
      signerName: params.signerName,
      signedAt: params.signedAt,
      receiptUrl,
    });

    const to = signerEmailAddress(params.signer);
    if (to && (params.signer.channel === 'EMAIL' || params.signer.channel === 'AMBOS')) {
      await deliverEmail(to, emailPayload, [attachment]);
      return true;
    }

    const phone =
      params.signer.phone?.trim() ||
      (params.signer.channel === 'WHATSAPP' ? params.signer.recipient : undefined);
    if (phone && (params.signer.channel === 'WHATSAPP' || params.signer.channel === 'AMBOS')) {
      const text = `Fortify: sua assinatura em "${params.contractTitle}" foi registrada. Comprovante: ${receiptUrl}`;
      await deliverWhatsapp(phone, text);
    }
    return false;
  }

  async sendFlowCompletedEmails(
    flow: NonNullable<Awaited<ReturnType<SignaturesRepositoryPort['findFlowByIdForCompany']>>>,
    contractTitle: string,
    pdfBuffer: Buffer,
  ): Promise<boolean> {
    const attachment: MailAttachment = {
      filename: signedDocumentFilename(contractTitle),
      content: pdfBuffer,
    };
    let anySent = false;
    for (const s of flow.signers) {
      const to = signerEmailAddress(s);
      if (!to || (s.channel !== 'EMAIL' && s.channel !== 'AMBOS')) continue;
      const signedPdfUrl = `${publicApiBase()}/signatures/public/${s.token}/signed-pdf`;
      const emailPayload = signatureCompletedEmail({
        contractTitle,
        signerName: s.signerName ?? s.name,
        signedPdfUrl,
      });
      await deliverEmail(to, emailPayload, [attachment]);
      anySent = true;
    }
    return anySent;
  }

  async generateAndStorePdf(
    flow: NonNullable<Awaited<ReturnType<SignaturesRepositoryPort['findFlowByIdForCompany']>>>,
    companyId: string,
  ): Promise<{
    document: Awaited<ReturnType<SignaturesRepositoryPort['saveContractDocument']>>;
    pdfBuffer: Buffer;
  }> {
    const existing = flow.documents.find((d) => d.type === 'SIGNED_PDF');
    if (existing) {
      const upload = await this.repo.findUploadById(existing.uploadId, companyId);
      if (upload && fs.existsSync(upload.path)) {
        return { document: existing, pdfBuffer: fs.readFileSync(upload.path) };
      }
    }

    const signersEvidence: SignerEvidence[] = flow.signers
      .filter((s) => s.signedAt && s.signerName)
      .map((s) => ({
        name: s.name,
        signerName: s.signerName!,
        signedAt: s.signedAt!,
        signatureImage: s.signatureImage,
        signatureTyped: s.signatureTyped,
        documentHashAtSign: s.documentHashAtSign,
        signatureKey: signatureKeyFromRole(s.role),
      }));

    const eventsSummary = flow.events.map((e) => `${e.createdAt.toISOString()} · ${e.eventType}`);

    let pdfBuffer: Buffer;
    const frozenDoc = flow.documents.find((d) => d.type === 'FROZEN_PDF');
    if (frozenDoc && flow.documentPdfHash) {
      const upload = await this.repo.findUploadById(frozenDoc.uploadId, companyId);
      if (upload && fs.existsSync(upload.path)) {
        const frozenBuffer = fs.readFileSync(upload.path);
        pdfBuffer = await sealSignedPdf({
          frozenPdfBuffer: frozenBuffer,
          documentHash: flow.documentHash,
          documentPdfHash: flow.documentPdfHash,
          legalTermsVersion: flow.legalTermsVersion,
          legalPrivacyVersion: flow.legalPrivacyVersion,
          flowId: flow.id,
          signers: signersEvidence,
          placements: parsePlacements(flow.signatureFieldPlacements),
          eventsSummary,
        });
      } else {
        pdfBuffer = await generateSignedPdf({
          contractTitle: flow.contract.title,
          frozenBodyHtml: flow.frozenBodyHtml,
          documentHash: flow.documentHash,
          documentPdfHash: flow.documentPdfHash,
          legalTermsVersion: flow.legalTermsVersion,
          legalPrivacyVersion: flow.legalPrivacyVersion,
          flowId: flow.id,
          signers: signersEvidence,
          eventsSummary,
        });
      }
    } else {
      pdfBuffer = await generateSignedPdf({
        contractTitle: flow.contract.title,
        frozenBodyHtml: flow.frozenBodyHtml,
        documentHash: flow.documentHash,
        legalTermsVersion: flow.legalTermsVersion,
        legalPrivacyVersion: flow.legalPrivacyVersion,
        flowId: flow.id,
        signers: signersEvidence,
        eventsSummary,
      });
    }

    fs.mkdirSync(uploadDir, { recursive: true });
    const filename = `contrato-assinado-${flow.contractId.slice(0, 8)}.pdf`;
    const storedName = `${uuid()}.pdf`;
    const filePath = path.join(uploadDir, storedName);
    fs.writeFileSync(filePath, pdfBuffer);

    const upload = await this.repo.createUploadRecord({
      companyId,
      entityType: 'ContractDocument',
      entityId: flow.contractId,
      filename,
      path: filePath,
      mimeType: 'application/pdf',
      size: pdfBuffer.length,
    });

    const document = await this.repo.saveContractDocument({
      contractId: flow.contractId,
      flowId: flow.id,
      uploadId: upload.id,
      contentHash: hashPdfBuffer(pdfBuffer),
      companyId,
    });
    return { document, pdfBuffer };
  }
}
