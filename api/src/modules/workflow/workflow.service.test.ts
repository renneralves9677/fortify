import { describe, it, expect, beforeEach } from 'vitest';
import { ContractStatus } from '@prisma/client';
import { WorkflowService } from './workflow.service.js';
import type { WorkflowRepository } from './workflow.repository.js';

class FakeWorkflowRepository implements Partial<WorkflowRepository> {
  contracts = new Map<string, { id: string; companyId: string; status: string; value: number; type: string }>();

  findContractByIdForCompany(id: string, companyId: string) {
    const c = this.contracts.get(id);
    if (!c || c.companyId !== companyId) return Promise.resolve(null);
    return Promise.resolve(c);
  }

  updateContractStatus() {
    return Promise.resolve({} as never);
  }

  findPendingApproval() {
    return Promise.resolve(null);
  }
}

describe('WorkflowService', () => {
  let repo: FakeWorkflowRepository;
  let service: WorkflowService;

  beforeEach(() => {
    repo = new FakeWorkflowRepository();
    service = new WorkflowService(repo as WorkflowRepository);
    repo.contracts.set('c1', {
      id: 'c1',
      companyId: 'co-1',
      status: ContractStatus.ASSINADO,
      value: 1000,
      type: 'SERVICO',
    });
  });

  it('blocks revisao when contract is not draft', async () => {
    await expect(service.submitRevisao('c1', 'co-1')).rejects.toMatchObject({
      code: 'INVALID_STATUS',
    });
  });

  it('allows revisao for draft contract', async () => {
    repo.contracts.set('c1', {
      id: 'c1',
      companyId: 'co-1',
      status: ContractStatus.RASCUNHO,
      value: 1000,
      type: 'SERVICO',
    });
    const result = await service.submitRevisao('c1', 'co-1');
    expect(result.status).toBe(ContractStatus.REVISAO);
  });
});
