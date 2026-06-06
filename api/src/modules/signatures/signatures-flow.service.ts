import fs from 'fs';
import path from 'path';
import { v4 as uuid } from 'uuid';
import {
  ContractStatus,
  SignatureFlowMode,
  SignatureFlowStatus,
  type Prisma,
} from '@prisma/client';
import { AppError } from '../../core/errors/AppError.js';
import { getLegalConfig } from '../../core/config/legal.js';
import { signatureLinkEmail } from '../../core/email/templates.js';
import { withPrismaError } from '../../core/errors/prisma-mapper.js';
import { isSignaturePdfFirstEnabled } from '../../core/config/signature.js';
import { sanitizeHtml } from '../../domain/contracts/html-sanitizer.js';
import { hashDocument } from '../../domain/signatures/document-hash.js';
import { buildWhatsappSignatureLinkMessage } from '../../domain/signatures/whatsapp-signature.js';
import { validateSignatureSigners } from '../../domain/contracts/template-renderer.js';
import {
  renderHtmlToPdf,
  type SignatureFieldPlacement,
} from '../../domain/signatures/html-to-pdf.js';
import { hashPdfBuffer } from '../../domain/signatures/signed-document-pdf.js';
import type { CreateFlowInput } from './signatures.schema.js';
import type { SignaturesRepositoryPort } from './signatures.repository.port.js';
import { notifySigner, serializeEvent, serializeFlow, uploadDir } from './signatures-shared.js';

export class SignaturesFlowService {
  constructor(private readonly repo: SignaturesRepositoryPort) {}

  async createSignatureFlow(contractId: string, companyId: string, input: CreateFlowInput) {
    const contract = await this.repo.findContractByIdForCompany(contractId, companyId);
    if (!contract) {
      throw new AppError(404, 'Contrato não encontrado', 'CONTRACT_NOT_FOUND');
    }
    if (
      contract.status !== ContractStatus.RASCUNHO &&
      contract.status !== ContractStatus.AGUARDANDO_ASSINATURA
    ) {
      throw new AppError(400, 'Contrato não elegível para assinatura', 'INVALID_STATUS');
    }

    const active = await this.repo.findActiveFlowForContract(contractId);
    if (active) {
      throw new AppError(400, 'Já existe fluxo de assinatura ativo', 'FLOW_ALREADY_ACTIVE');
    }

    const templateFields = contract.template?.fields ?? [];
    const signerValidation = validateSignatureSigners(templateFields, input.signers);
    if (signerValidation) {
      throw new AppError(400, signerValidation, 'SIGNATURE_ROLES_INVALID');
    }

    const legal = getLegalConfig();
    const frozenBodyHtml = sanitizeHtml(contract.bodyHtml);
    const documentHash = hashDocument(frozenBodyHtml);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    let documentPdfHash: string | null = null;
    let frozenPdfUploadId: string | null = null;
    let signatureFieldPlacements: SignatureFieldPlacement[] | undefined;

    if (isSignaturePdfFirstEnabled()) {
      const { pdfBuffer, placements } = await renderHtmlToPdf(frozenBodyHtml);
      documentPdfHash = hashPdfBuffer(pdfBuffer);
      signatureFieldPlacements = placements;

      fs.mkdirSync(uploadDir, { recursive: true });
      const storedName = `${uuid()}.pdf`;
      const filePath = path.join(uploadDir, storedName);
      fs.writeFileSync(filePath, pdfBuffer);

      const upload = await this.repo.createUploadRecord({
        companyId: contract.companyId,
        entityType: 'ContractDocument',
        entityId: contract.id,
        filename: `contrato-congelado-${contract.id.slice(0, 8)}.pdf`,
        path: filePath,
        mimeType: 'application/pdf',
        size: pdfBuffer.length,
      });
      frozenPdfUploadId = upload.id;
    }

    const signers = input.signers.map((s, i) => ({
      signOrder: i + 1,
      role: s.role ?? 'signatario',
      name: s.name,
      email: s.email,
      phone: s.phone,
      channel: s.channel,
      recipient: s.recipient,
      expiresAt,
    }));

    const flow = await withPrismaError(() =>
      this.repo.createFlowWithSigners({
        contractId: contract.id,
        documentHash,
        documentPdfHash,
        frozenBodyHtml,
        frozenPdfUploadId,
        signatureFieldPlacements: signatureFieldPlacements as Prisma.InputJsonValue | undefined,
        legalTermsVersion: legal.termsVersion,
        legalPrivacyVersion: legal.privacyVersion,
        signMode: input.signMode,
        signers,
      }),
    );

    if (frozenPdfUploadId && documentPdfHash) {
      await this.repo.saveContractDocument({
        contractId: contract.id,
        flowId: flow.id,
        uploadId: frozenPdfUploadId,
        contentHash: documentPdfHash,
        companyId: contract.companyId,
        type: 'FROZEN_PDF',
      });
    }

    const toNotify =
      input.signMode === SignatureFlowMode.PARALLEL
        ? flow.signers
        : flow.signers.filter((s) => s.signOrder === 1);
    for (const signer of toNotify) {
      const link = `${process.env.WEB_URL ?? 'http://localhost:5173'}/assinatura/${signer.token}`;
      await notifySigner(signer, {
        text: buildWhatsappSignatureLinkMessage(contract.title, link),
        email: signatureLinkEmail(contract.title, link),
      });
    }

    console.log(
      `[SIGNATURE_FLOW] contrato=${contractId} fluxo=${flow.id} signatarios=${flow.signers.length} links=${flow.signers.map((s) => `${s.name}=${process.env.WEB_URL ?? 'http://localhost:5173'}/assinatura/${s.token}`).join(' | ')}`,
    );

    return serializeFlow(flow);
  }

  async getFlow(flowId: string, companyId: string) {
    const flow = await this.repo.findFlowByIdForCompany(flowId, companyId);
    if (!flow) {
      throw new AppError(404, 'Fluxo não encontrado', 'FLOW_NOT_FOUND');
    }
    return serializeFlow(flow);
  }

  async getFlowTimeline(flowId: string, companyId: string) {
    const flow = await this.repo.findFlowByIdForCompany(flowId, companyId);
    if (!flow) {
      throw new AppError(404, 'Fluxo não encontrado', 'FLOW_NOT_FOUND');
    }
    return [...flow.events]
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map((ev) =>
        serializeEvent({
          ...ev,
          signer: flow.signers.find((s) => s.id === ev.signerId) ?? null,
        }),
      );
  }

  async getContractFlow(contractId: string, companyId: string) {
    const flow = await this.repo.findLatestFlowForContract(contractId, companyId);
    if (!flow) return null;
    return serializeFlow(flow);
  }

  async cancelFlow(flowId: string, companyId: string) {
    const flow = await this.repo.findFlowByIdForCompany(flowId, companyId);
    if (!flow) {
      throw new AppError(404, 'Fluxo não encontrado', 'FLOW_NOT_FOUND');
    }
    if (flow.status !== SignatureFlowStatus.IN_PROGRESS) {
      throw new AppError(400, 'Fluxo não pode ser cancelado', 'INVALID_FLOW_STATUS');
    }
    await this.repo.cancelFlow(flowId, flow.contractId, companyId);
    return { success: true };
  }
}
