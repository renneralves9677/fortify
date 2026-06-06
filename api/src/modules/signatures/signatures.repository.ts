import {
  ContractSignerStatus,
  ContractStatus,
  SignatureFlowMode,
  SignatureFlowStatus,
  SignatureChannel,
  SignatureStatus,
  type Prisma,
} from '@prisma/client';
import { prisma } from '../../core/database/prisma.js';
import { buildEventData, type RecordEventInput } from '../../domain/signatures/signature-event-recorder.js';
import type { SignaturesRepositoryPort } from './signatures.repository.port.js';

const FLOW_INCLUDE = {
  signers: { orderBy: { signOrder: 'asc' as const } },
  events: { orderBy: { createdAt: 'asc' as const } },
  documents: true,
  contract: {
    select: {
      id: true,
      title: true,
      companyId: true,
      status: true,
      partyName: true,
      template: { include: { fields: { orderBy: { sortOrder: 'asc' as const } } } },
    },
  },
};

/** Supabase pooler latency can exceed Prisma's default 5s interactive tx timeout. */
const TX_OPTIONS = { maxWait: 15_000, timeout: 30_000 } as const;

export class SignaturesRepository implements SignaturesRepositoryPort {
  findPendingQueue(companyId: string) {
    return prisma.signatureRequest.findMany({
      where: {
        status: SignatureStatus.PENDENTE,
        contract: { companyId },
      },
      include: {
        contract: { select: { id: true, title: true, partyName: true, status: true } },
      },
      orderBy: { sentAt: 'desc' },
    });
  }

  private flowsQueueWhere(
    companyId: string,
    filters: {
      search?: string;
      status?: SignatureFlowStatus | 'ALL';
      progress?: 'PENDING' | 'PARTIAL';
    } = {},
  ): Prisma.ContractSignatureFlowWhereInput {
    const { search, status, progress } = filters;
    const statusFilter =
      !status || status === 'ALL'
        ? {
            in: [
              SignatureFlowStatus.IN_PROGRESS,
              SignatureFlowStatus.COMPLETED,
              SignatureFlowStatus.CANCELLED,
              SignatureFlowStatus.EXPIRED,
            ],
          }
        : status;

    const where: Prisma.ContractSignatureFlowWhereInput = {
      status: statusFilter,
      contract: { companyId },
    };

    const term = search?.trim();
    if (term) {
      where.OR = [
        { contract: { title: { contains: term, mode: 'insensitive' } } },
        { contract: { partyName: { contains: term, mode: 'insensitive' } } },
        { signers: { some: { name: { contains: term, mode: 'insensitive' } } } },
        { signers: { some: { email: { contains: term, mode: 'insensitive' } } } },
      ];
    }

    if (progress === 'PENDING') {
      where.signers = {
        every: {
          status: { notIn: [ContractSignerStatus.SIGNED, ContractSignerStatus.DECLINED] },
        },
      };
    } else if (progress === 'PARTIAL') {
      where.AND = [
        { signers: { some: { status: ContractSignerStatus.SIGNED } } },
        {
          signers: {
            some: {
              status: { notIn: [ContractSignerStatus.SIGNED, ContractSignerStatus.DECLINED] },
            },
          },
        },
      ];
    }

    return where;
  }

  findActiveFlowsQueue(
    companyId: string,
    options: {
      search?: string;
      status?: SignatureFlowStatus | 'ALL';
      progress?: 'PENDING' | 'PARTIAL';
      skip?: number;
      take?: number;
    } = {},
  ) {
    const { search, status, progress, skip, take } = options;
    return prisma.contractSignatureFlow.findMany({
      where: this.flowsQueueWhere(companyId, { search, status, progress }),
      include: FLOW_INCLUDE,
      orderBy: { startedAt: 'desc' },
      ...(skip !== undefined ? { skip } : {}),
      ...(take !== undefined ? { take } : {}),
    });
  }

  countActiveFlowsQueue(
    companyId: string,
    filters: {
      search?: string;
      status?: SignatureFlowStatus | 'ALL';
      progress?: 'PENDING' | 'PARTIAL';
    } = {},
  ) {
    return prisma.contractSignatureFlow.count({
      where: this.flowsQueueWhere(companyId, filters),
    });
  }

  findContractByIdForCompany(contractId: string, companyId: string) {
    return prisma.contract.findFirst({
      where: { id: contractId, companyId },
      include: { template: { include: { fields: { orderBy: { sortOrder: 'asc' } } } } },
    });
  }

  findActiveFlowForContract(contractId: string) {
    return prisma.contractSignatureFlow.findFirst({
      where: {
        contractId,
        status: { in: [SignatureFlowStatus.IN_PROGRESS, SignatureFlowStatus.DRAFT] },
      },
    });
  }

  createSignatureRequest(data: {
    contractId: string;
    channel: SignatureChannel;
    recipient: string;
    expiresAt: Date;
  }) {
    return prisma.signatureRequest.create({ data });
  }

  updateContractStatus(contractId: string, status: ContractStatus) {
    return prisma.contract.update({
      where: { id: contractId },
      data: { status },
    });
  }

  findByToken(token: string) {
    return prisma.signatureRequest.findUnique({
      where: { token },
      include: { contract: true },
    });
  }

  findSignerByToken(token: string) {
    return prisma.contractSigner.findUnique({
      where: { token },
      include: {
        flow: {
          include: {
            signers: { orderBy: { signOrder: 'asc' } },
            contract: {
              include: {
                template: { include: { fields: { orderBy: { sortOrder: 'asc' } } } },
              },
            },
          },
        },
      },
    });
  }

  signContractTransaction(requestId: string, contractId: string) {
    return prisma.$transaction([
      prisma.signatureRequest.update({
        where: { id: requestId },
        data: { status: SignatureStatus.ASSINADO, signedAt: new Date() },
      }),
      prisma.contract.update({
        where: { id: contractId },
        data: { status: ContractStatus.ASSINADO, signedAt: new Date() },
      }),
    ]);
  }

  findHistoryForContract(contractId: string, companyId: string) {
    return prisma.signatureRequest.findMany({
      where: { contractId, contract: { companyId } },
      orderBy: { sentAt: 'desc' },
    });
  }

  findFlowByIdForCompany(flowId: string, companyId: string) {
    return prisma.contractSignatureFlow.findFirst({
      where: { id: flowId, contract: { companyId } },
      include: FLOW_INCLUDE,
    });
  }

  findLatestFlowForContract(contractId: string, companyId: string) {
    return prisma.contractSignatureFlow.findFirst({
      where: { contractId, contract: { companyId } },
      include: FLOW_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  findSignedDocument(contractId: string, companyId: string) {
    return prisma.contractDocument.findFirst({
      where: { contractId, contract: { companyId }, type: 'SIGNED_PDF' },
      orderBy: { generatedAt: 'desc' },
    });
  }

  findFrozenDocument(flowId: string) {
    return prisma.contractDocument.findFirst({
      where: { flowId, type: 'FROZEN_PDF' },
    });
  }

  findSignerByTokenWithDocuments(token: string) {
    return prisma.contractSigner.findUnique({
      where: { token },
      include: {
        flow: {
          include: {
            signers: { orderBy: { signOrder: 'asc' } },
            documents: true,
            contract: {
              include: {
                template: { include: { fields: { orderBy: { sortOrder: 'asc' } } } },
              },
            },
          },
        },
      },
    });
  }

  findSignatureAppliedEvent(flowId: string, signerId: string) {
    return prisma.signatureEvent.findFirst({
      where: { flowId, signerId, eventType: 'SIGNATURE_APPLIED' },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getLastEventHash(flowId: string): Promise<string | null> {
    const last = await prisma.signatureEvent.findFirst({
      where: { flowId },
      orderBy: { createdAt: 'desc' },
      select: { eventHash: true },
    });
    return last?.eventHash ?? null;
  }

  async recordEvent(input: RecordEventInput) {
    const previousEventHash = input.previousEventHash ?? (await this.getLastEventHash(input.flowId));
    const data = buildEventData({ ...input, previousEventHash });
    return prisma.signatureEvent.create({ data });
  }

  async createFlowWithSigners(params: {
    contractId: string;
    documentHash: string;
    documentPdfHash?: string | null;
    frozenBodyHtml: string;
    frozenPdfUploadId?: string | null;
    signatureFieldPlacements?: Prisma.InputJsonValue;
    legalTermsVersion: string;
    legalPrivacyVersion: string;
    signMode?: SignatureFlowMode;
    signers: Array<{
      signOrder: number;
      role: string;
      name: string;
      email?: string;
      phone?: string;
      channel: SignatureChannel;
      recipient: string;
      expiresAt: Date;
    }>;
  }) {
    return prisma.$transaction(async (tx) => {
      const flow = await tx.contractSignatureFlow.create({
        data: {
          contractId: params.contractId,
          status: SignatureFlowStatus.IN_PROGRESS,
          documentHash: params.documentHash,
          documentPdfHash: params.documentPdfHash ?? null,
          frozenBodyHtml: params.frozenBodyHtml,
          frozenPdfUploadId: params.frozenPdfUploadId ?? null,
          signatureFieldPlacements: params.signatureFieldPlacements ?? undefined,
          legalTermsVersion: params.legalTermsVersion,
          legalPrivacyVersion: params.legalPrivacyVersion,
          signMode: params.signMode ?? SignatureFlowMode.PARALLEL,
          startedAt: new Date(),
        },
      });

      const parallel = (params.signMode ?? SignatureFlowMode.PARALLEL) === SignatureFlowMode.PARALLEL;

      let previousEventHash: string | null = null;
      const recordInTx = async (input: Omit<RecordEventInput, 'flowId'>) => {
        const data = buildEventData({ ...input, flowId: flow.id, previousEventHash });
        const ev = await tx.signatureEvent.create({ data });
        previousEventHash = ev.eventHash;
      };

      await recordInTx({ eventType: 'FLOW_STARTED' });
      await recordInTx({
        eventType: 'DOCUMENT_FROZEN',
        metadata: {
          documentHash: params.documentHash,
          documentPdfHash: params.documentPdfHash ?? null,
        },
      });

      for (const s of params.signers) {
        const status = parallel
          ? ContractSignerStatus.PENDING
          : s.signOrder === 1
            ? ContractSignerStatus.PENDING
            : ContractSignerStatus.WAITING;
        const signer = await tx.contractSigner.create({
          data: {
            flowId: flow.id,
            signOrder: s.signOrder,
            role: s.role,
            name: s.name,
            email: s.email,
            phone: s.phone,
            status,
            channel: s.channel,
            recipient: s.recipient,
            expiresAt: s.expiresAt,
            sentAt: parallel || s.signOrder === 1 ? new Date() : null,
          },
        });
        if (parallel || s.signOrder === 1) {
          await recordInTx({
            signerId: signer.id,
            eventType: 'LINK_SENT',
            metadata: { recipient: s.recipient, channel: s.channel },
          });
        }
      }

      await tx.contract.update({
        where: { id: params.contractId },
        data: { status: ContractStatus.AGUARDANDO_ASSINATURA },
      });

      return tx.contractSignatureFlow.findUniqueOrThrow({
        where: { id: flow.id },
        include: FLOW_INCLUDE,
      });
    }, TX_OPTIONS);
  }

  private async getLastEventHashInTx(
    tx: Prisma.TransactionClient,
    flowId: string,
  ): Promise<string | null> {
    const last = await tx.signatureEvent.findFirst({
      where: { flowId },
      orderBy: { createdAt: 'desc' },
      select: { eventHash: true },
    });
    return last?.eventHash ?? null;
  }

  async markSignerViewed(signerId: string, flowId: string, ip?: string, userAgent?: string) {
    return prisma.$transaction(async (tx) => {
      const signer = await tx.contractSigner.update({
        where: { id: signerId },
        data: {
          status: ContractSignerStatus.VIEWED,
          viewedAt: new Date(),
          signerIp: ip,
          signerUserAgent: userAgent,
        },
      });
      const previousEventHash = await this.getLastEventHashInTx(tx, flowId);
      await tx.signatureEvent.create({
        data: buildEventData({
          flowId,
          signerId,
          eventType: 'LINK_OPENED',
          ip,
          userAgent,
          previousEventHash,
        }),
      });
      return signer;
    }, TX_OPTIONS);
  }

  async recordConsent(signerId: string, flowId: string, ip?: string, userAgent?: string) {
    return prisma.$transaction(async (tx) => {
      const signer = await tx.contractSigner.update({
        where: { id: signerId },
        data: { consentAt: new Date() },
      });
      const previousEventHash = await this.getLastEventHashInTx(tx, flowId);
      await tx.signatureEvent.create({
        data: buildEventData({
          flowId,
          signerId,
          eventType: 'CONSENT_ACCEPTED',
          ip,
          userAgent,
          previousEventHash,
        }),
      });
      return signer;
    }, TX_OPTIONS);
  }

  async applySignature(params: {
    signerId: string;
    flowId: string;
    contractId: string;
    documentHash: string;
    signerName: string;
    signatureImage?: string;
    signatureTyped?: string;
    ip?: string;
    userAgent?: string;
    isLastSigner: boolean;
    nextSignerId?: string;
    nextExpiresAt?: Date;
  }) {
    return prisma.$transaction(async (tx) => {
      await tx.contractSigner.update({
        where: { id: params.signerId },
        data: {
          status: ContractSignerStatus.SIGNED,
          signedAt: new Date(),
          signerName: params.signerName,
          signatureImage: params.signatureImage,
          signatureTyped: params.signatureTyped,
          signerIp: params.ip,
          signerUserAgent: params.userAgent,
          documentHashAtSign: params.documentHash,
        },
      });

      let previousEventHash = await this.getLastEventHashInTx(tx, params.flowId);
      await tx.signatureEvent.create({
        data: buildEventData({
          flowId: params.flowId,
          signerId: params.signerId,
          eventType: 'SIGNATURE_APPLIED',
          metadata: { signerName: params.signerName },
          ip: params.ip,
          userAgent: params.userAgent,
          previousEventHash,
        }),
      });

      if (params.nextSignerId && params.nextExpiresAt) {
        await tx.contractSigner.update({
          where: { id: params.nextSignerId },
          data: {
            status: ContractSignerStatus.PENDING,
            sentAt: new Date(),
            expiresAt: params.nextExpiresAt,
          },
        });
        previousEventHash = await this.getLastEventHashInTx(tx, params.flowId);
        await tx.signatureEvent.create({
          data: buildEventData({
            flowId: params.flowId,
            signerId: params.nextSignerId,
            eventType: 'SIGNER_ACTIVATED',
            previousEventHash,
          }),
        });
      }

      if (params.isLastSigner) {
        await tx.contractSignatureFlow.update({
          where: { id: params.flowId },
          data: {
            status: SignatureFlowStatus.COMPLETED,
            completedAt: new Date(),
          },
        });
        await tx.contract.update({
          where: { id: params.contractId },
          data: { status: ContractStatus.ASSINADO, signedAt: new Date() },
        });
        previousEventHash = await this.getLastEventHashInTx(tx, params.flowId);
        await tx.signatureEvent.create({
          data: buildEventData({
            flowId: params.flowId,
            eventType: 'FLOW_COMPLETED',
            previousEventHash,
          }),
        });
      }

      return tx.contractSignatureFlow.findUniqueOrThrow({
        where: { id: params.flowId },
        include: FLOW_INCLUDE,
      });
    }, TX_OPTIONS);
  }

  async cancelFlow(flowId: string, contractId: string, companyId: string) {
    return prisma.$transaction(async (tx) => {
      const flow = await tx.contractSignatureFlow.update({
        where: { id: flowId },
        data: { status: SignatureFlowStatus.CANCELLED },
      });
      await tx.contractSigner.updateMany({
        where: { flowId, status: { in: [ContractSignerStatus.WAITING, ContractSignerStatus.PENDING, ContractSignerStatus.VIEWED] } },
        data: { status: ContractSignerStatus.EXPIRED },
      });
      const previousEventHash = await this.getLastEventHashInTx(tx, flowId);
      await tx.signatureEvent.create({
        data: buildEventData({
          flowId,
          eventType: 'FLOW_CANCELLED',
          previousEventHash,
        }),
      });
      const contract = await tx.contract.findFirst({ where: { id: contractId, companyId } });
      if (contract?.status === ContractStatus.AGUARDANDO_ASSINATURA) {
        await tx.contract.update({
          where: { id: contractId },
          data: { status: ContractStatus.RASCUNHO },
        });
      }
      return flow;
    }, TX_OPTIONS);
  }

  async saveContractDocument(data: {
    contractId: string;
    flowId: string;
    uploadId: string;
    contentHash: string;
    companyId: string;
    type?: 'FROZEN_PDF' | 'SIGNED_PDF';
  }) {
    return prisma.$transaction(async (tx) => {
      const doc = await tx.contractDocument.create({
        data: {
          contractId: data.contractId,
          flowId: data.flowId,
          type: data.type ?? 'SIGNED_PDF',
          uploadId: data.uploadId,
          contentHash: data.contentHash,
        },
      });
      const previousEventHash = await this.getLastEventHashInTx(tx, data.flowId);
      await tx.signatureEvent.create({
        data: buildEventData({
          flowId: data.flowId,
          eventType: 'DOCUMENT_GENERATED',
          metadata: { uploadId: data.uploadId, contentHash: data.contentHash },
          previousEventHash,
        }),
      });
      return doc;
    }, TX_OPTIONS);
  }

  createUploadRecord(data: {
    companyId: string;
    entityType: string;
    entityId: string;
    filename: string;
    path: string;
    mimeType: string;
    size: number;
  }) {
    return prisma.upload.create({ data });
  }

  findUploadById(id: string, companyId: string) {
    return prisma.upload.findFirst({ where: { id, companyId } });
  }

  createSignerOtp(signerId: string, code: string, expiresAt: Date) {
    return prisma.signerOtp.create({ data: { signerId, code, expiresAt } });
  }

  findLatestOtp(signerId: string) {
    return prisma.signerOtp.findFirst({
      where: { signerId },
      orderBy: { createdAt: 'desc' },
    });
  }

  markOtpVerified(id: string) {
    return prisma.signerOtp.update({
      where: { id },
      data: { verifiedAt: new Date() },
    });
  }

  hasVerifiedOtp(signerId: string) {
    return prisma.signerOtp.findFirst({
      where: { signerId, verifiedAt: { not: null } },
    });
  }
}
