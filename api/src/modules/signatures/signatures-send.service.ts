import { ContractStatus } from '@prisma/client';
import { AppError } from '../../core/errors/AppError.js';
import { withPrismaError } from '../../core/errors/prisma-mapper.js';
import { signatureLinkEmail } from '../../core/email/templates.js';
import { buildWhatsappSignatureLinkMessage } from '../../domain/signatures/whatsapp-signature.js';
import type { SendSignatureInput } from './signatures.schema.js';
import type { SignaturesRepositoryPort } from './signatures.repository.port.js';
import { deliverEmail, deliverWhatsapp } from './signatures-shared.js';

export class SignaturesSendService {
  constructor(private readonly repo: SignaturesRepositoryPort) {}

  async sendSignatureRequest(contractId: string, companyId: string, input: SendSignatureInput) {
    const contract = await this.repo.findContractByIdForCompany(contractId, companyId);
    if (!contract) {
      throw new AppError(404, 'Contrato não encontrado', 'CONTRACT_NOT_FOUND');
    }

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const request = await withPrismaError(() =>
      this.repo.createSignatureRequest({
        contractId: contract.id,
        channel: input.channel,
        recipient: input.recipient,
        expiresAt,
      }),
    );

    await this.repo.updateContractStatus(contract.id, ContractStatus.AGUARDANDO_ASSINATURA);

    const link = `${process.env.WEB_URL ?? 'http://localhost:5173'}/assinatura/${request.token}`;
    const email = signatureLinkEmail(contract.title, link);
    if (input.channel === 'EMAIL' || input.channel === 'AMBOS') {
      await deliverEmail(input.recipient, email);
    }
    if (input.channel === 'WHATSAPP' || input.channel === 'AMBOS') {
      await deliverWhatsapp(input.recipient, buildWhatsappSignatureLinkMessage(contract.title, link));
    }

    return { ...request, signUrl: link };
  }
}
