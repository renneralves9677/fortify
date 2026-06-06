import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ContractSignerStatus, SignatureFlowMode } from '@prisma/client';
import { SignaturesService } from './signatures.service.js';
import type { SignaturesRepositoryPort } from './signatures.repository.port.js';
import { createFlowSchema } from './signatures.schema.js';

vi.mock('../../core/email/mailer.js', () => ({
  sendMail: vi.fn().mockResolvedValue({ sent: true }),
}));

function createRepoMock(overrides: Partial<SignaturesRepositoryPort> = {}): SignaturesRepositoryPort {
  return {
    findSignerByToken: vi.fn(),
    recordConsent: vi.fn(),
    applySignature: vi.fn(),
    recordEvent: vi.fn(),
    ...overrides,
  } as SignaturesRepositoryPort;
}

describe('SignaturesService signFlowPublic', () => {
  beforeEach(() => {
    process.env.LEGAL_TERMS_VERSION = '1.0';
    process.env.LEGAL_PRIVACY_VERSION = '1.0';
  });

  it('rejects sign without prior consent', async () => {
    const repo = createRepoMock({
      findSignerByToken: vi.fn().mockResolvedValue({
        id: 's1',
        flowId: 'f1',
        status: ContractSignerStatus.VIEWED,
        consentAt: null,
        expiresAt: new Date(Date.now() + 86400000),
        flow: {
          id: 'f1',
          contractId: 'c1',
          documentHash: 'abc',
          frozenBodyHtml: '<p>x</p>',
          status: 'IN_PROGRESS',
          signers: [],
          contract: { companyId: 'co1', title: 'T', partyName: 'P' },
        },
      }),
    });
    const service = new SignaturesService(repo);
    await expect(
      service.signFlowPublic(
        'token',
        {
          signerName: 'João',
          scrollPercent: 100,
          acceptTerms: true,
          signatureTyped: 'João',
        },
        { headers: {}, socket: { remoteAddress: '127.0.0.1' } } as never,
      ),
    ).rejects.toMatchObject({ code: 'CONSENT_REQUIRED' });
  });

  it('defaults new flows to PARALLEL sign mode', () => {
    const parsed = createFlowSchema.parse({
      signers: [
        {
          name: 'Maria',
          role: 'contratante',
          email: 'maria@test.com',
          channel: 'EMAIL',
          recipient: 'maria@test.com',
        },
      ],
    });
    expect(parsed.signMode).toBe(SignatureFlowMode.PARALLEL);
  });

  it('rejects waiting signer (wrong turn)', async () => {
    const repo = createRepoMock({
      findSignerByToken: vi.fn().mockResolvedValue({
        id: 's2',
        status: ContractSignerStatus.WAITING,
        expiresAt: new Date(Date.now() + 86400000),
        flow: {
          status: 'IN_PROGRESS',
          signers: [{ id: 's1', name: 'Maria', status: ContractSignerStatus.PENDING, signOrder: 1 }],
        },
      }),
    });
    const service = new SignaturesService(repo);
    await expect(
      service.consentPublic(
        'token',
        { acceptTerms: true, termsVersion: '1.0', privacyVersion: '1.0' },
        { headers: {}, socket: {} } as never,
      ),
    ).rejects.toMatchObject({ code: 'SIGNATURE_NOT_YOUR_TURN' });
  });

  it('allows parallel second signer with PENDING status', async () => {
    const repo = createRepoMock({
      findSignerByToken: vi.fn().mockResolvedValue({
        id: 's2',
        token: 'token-2',
        status: ContractSignerStatus.PENDING,
        expiresAt: new Date(Date.now() + 86400000),
        name: 'Pedro',
        role: 'contratado',
        flow: {
          id: 'f1',
          status: 'IN_PROGRESS',
          signMode: SignatureFlowMode.PARALLEL,
          documentHash: 'hash',
          documentPdfHash: null,
          frozenBodyHtml: '<p>doc</p>',
          legalTermsVersion: '1.0',
          legalPrivacyVersion: '1.0',
          signers: [
            { id: 's1', signOrder: 1, name: 'Maria', role: 'contratante', status: ContractSignerStatus.SIGNED },
            { id: 's2', signOrder: 2, name: 'Pedro', role: 'contratado', status: ContractSignerStatus.PENDING },
          ],
          contract: {
            title: 'Contrato Teste',
            partyName: 'Empresa',
            template: { fields: [] },
          },
        },
      }),
      markSignerViewed: vi.fn().mockResolvedValue(undefined),
      hasVerifiedOtp: vi.fn().mockResolvedValue(false),
    });
    const service = new SignaturesService(repo);
    const result = await service.getPublicSignature('token-2', {
      headers: {},
      socket: { remoteAddress: '127.0.0.1' },
    } as never);
    expect(result.canSign).toBe(true);
    expect(result.legacy).toBe(false);
  });
});
