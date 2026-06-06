import { describe, it, expect, beforeEach } from 'vitest';
import { ContractStatus } from '@prisma/client';
import { ContractsService } from './contracts.service.js';
import { AppError } from '../../core/errors/AppError.js';
import type { ContractsRepositoryPort } from './contracts.repository.port.js';

class FakeContractsRepository implements ContractsRepositoryPort {
  contracts: Array<{
    id: string;
    companyId: string;
    status: ContractStatus;
    title: string;
    partyName: string;
    value: number;
    endDate: Date | null;
    bodyHtml: string;
    fieldValues: object;
    templateId: string | null;
    companyId_ref: string;
    type: string;
    partyDocument: string | null;
    valueMonthly: number | null;
    startDate: Date | null;
    template?: { bodyHtml: string; fields: [] } | null;
  }> = [];

  findByIdForCompany(id: string, companyId: string) {
    return Promise.resolve(
      this.contracts.find((c) => c.id === id && c.companyId === companyId) ?? null,
    );
  }

  findInProgressFlowForContract(_contractId: string) {
    return Promise.resolve(null);
  }

  findDisplayFlowForContract(_contractId: string) {
    return Promise.resolve(null);
  }

  findLatestCompletedFlowForContract(_contractId: string) {
    return Promise.resolve(null);
  }

  findManyForCompany() {
    return Promise.resolve([]);
  }

  countManyForCompany() {
    return Promise.resolve(0);
  }

  findManagerContracts() {
    return Promise.resolve([]);
  }

  findTemplateByIdForCompany() {
    return Promise.resolve(null);
  }

  create() {
    throw new Error('not implemented');
  }

  update() {
    throw new Error('not implemented');
  }

  closeByIdForCompany() {
    throw new Error('not implemented');
  }

  updateStatus() {
    throw new Error('not implemented');
  }

  findVersions() {
    return Promise.resolve([]);
  }

  findVersionByNumber() {
    return Promise.resolve(null);
  }

  countVersions() {
    return Promise.resolve(0);
  }

  createVersion() {
    throw new Error('not implemented');
  }
}

describe('ContractsService', () => {
  let service: ContractsService;
  let repo: FakeContractsRepository;

  beforeEach(() => {
    repo = new FakeContractsRepository();
    service = new ContractsService(repo);
    repo.contracts.push({
      id: 'c1',
      companyId: 'co1',
      status: ContractStatus.ATIVO,
      title: 'Contrato teste',
      partyName: 'Cliente',
      value: 1000,
      endDate: new Date(Date.now() + 86400000 * 60),
      bodyHtml: '<p>html</p>',
      fieldValues: {},
      templateId: 't1',
      companyId_ref: 'co1',
      type: 'SERVICO',
      partyDocument: null,
      valueMonthly: null,
      startDate: new Date(),
      template: { bodyHtml: '<p>t</p>', fields: [] },
    });
  });

  it('returns contract by id', async () => {
    const result = await service.getContractById('c1', 'co1');
    expect(result?.title).toBe('Contrato teste');
    expect(result?.status).toBe('ATIVO');
  });

  it('throws when contract not found', async () => {
    await expect(service.getContractById('missing', 'co1')).rejects.toBeInstanceOf(AppError);
  });

  it('blocks update when signature flow is in progress', async () => {
    repo.contracts[0].status = ContractStatus.RASCUNHO;
    repo.findInProgressFlowForContract = () => Promise.resolve({ id: 'flow-1' });
    await expect(
      service.updateContract('c1', 'co1', { title: 'Novo título' }),
    ).rejects.toMatchObject({ code: 'FLOW_IN_PROGRESS' });
  });
});
