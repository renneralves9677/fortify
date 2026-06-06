import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ObraCostCategory, VistoriaType } from '@prisma/client';
import { AppError } from '../../core/errors/AppError.js';
import { ObrasService } from './obras.service.js';
import { DEFAULT_OBRA_STEPS } from './obras.repository.js';
import type { ObrasRepositoryPort } from './obras.repository.port.js';

vi.mock('../../middleware/audit.js', () => ({
  logAudit: vi.fn(),
}));

type ObraRow = {
  id: string;
  companyId: string;
  name: string;
  status: string;
  budgetPlanned: number;
  custos: { amount: number }[];
  vistorias: { type: string }[];
  purchaseOrders: unknown[];
  steps: { id: string; title: string; sortOrder: number; done: boolean; description?: string | null }[];
};

class FakeObrasRepository implements ObrasRepositoryPort {
  obras: ObraRow[] = [
    {
      id: 'obra-1',
      companyId: 'co-1',
      name: 'Obra Teste',
      status: 'ativa',
      budgetPlanned: 1000,
      custos: [],
      vistorias: [],
      purchaseOrders: [],
      steps: DEFAULT_OBRA_STEPS.map((s, i) => ({
        id: `step-${i + 1}`,
        title: s.title,
        sortOrder: s.sortOrder,
        done: false,
        description: null,
      })),
    },
  ];

  auditLogs: { action: string; entityId?: string; userId?: string; metadata?: object }[] = [];

  findByIdForCompany(id: string, companyId: string) {
    const obra = this.obras.find((o) => o.id === id && o.companyId === companyId);
    if (!obra) return Promise.resolve(null);
    return Promise.resolve({ ...obra, contract: null, occurrences: [] });
  }

  findStepsForObra(obraId: string, _companyId: string) {
    const obra = this.obras.find((o) => o.id === obraId);
    return Promise.resolve(obra?.steps ?? []);
  }

  findStepForObra(stepId: string, obraId: string, _companyId: string) {
    const obra = this.obras.find((o) => o.id === obraId);
    return Promise.resolve(obra?.steps.find((s) => s.id === stepId) ?? null);
  }

  getMaxStepSortOrder(obraId: string) {
    const obra = this.obras.find((o) => o.id === obraId);
    const max = obra?.steps.reduce((m, s) => Math.max(m, s.sortOrder), 0) ?? 0;
    return Promise.resolve({ _max: { sortOrder: max } });
  }

  createStep(obraId: string, data: { title: string; description?: string | null; sortOrder: number }) {
    const obra = this.obras.find((o) => o.id === obraId);
    const step = {
      id: `step-${Date.now()}`,
      title: data.title,
      description: data.description ?? null,
      sortOrder: data.sortOrder,
      done: false,
    };
    obra?.steps.push(step);
    return Promise.resolve(step);
  }

  updateStepForObra(
    stepId: string,
    obraId: string,
    _companyId: string,
    data: { done?: boolean; title?: string; description?: string | null },
  ) {
    const obra = this.obras.find((o) => o.id === obraId);
    const step = obra?.steps.find((s) => s.id === stepId);
    if (!step) return Promise.resolve({ count: 0 });
    Object.assign(step, data);
    return Promise.resolve({ count: 1 });
  }

  reorderSteps(obraId: string, _companyId: string, stepIds: string[]) {
    const obra = this.obras.find((o) => o.id === obraId);
    if (!obra) return Promise.resolve([]);
    obra.steps = stepIds.map((id, index) => {
      const step = obra.steps.find((s) => s.id === id)!;
      return { ...step, sortOrder: index + 1 };
    });
    return Promise.resolve([]);
  }

  deleteStepForObra(stepId: string, obraId: string, _companyId: string) {
    const obra = this.obras.find((o) => o.id === obraId);
    if (!obra) return Promise.resolve({ count: 0 });
    const before = obra.steps.length;
    obra.steps = obra.steps.filter((s) => s.id !== stepId);
    return Promise.resolve({ count: before - obra.steps.length });
  }

  createCusto(obraId: string, data: { category: string; description: string; amount: number; date: Date }) {
    const obra = this.obras.find((o) => o.id === obraId);
    const custo = { id: 'custo-1', obraId, ...data };
    obra?.custos.push({ amount: data.amount });
    return Promise.resolve(custo);
  }

  closeObra(id: string, companyId: string) {
    const obra = this.obras.find((o) => o.id === id && o.companyId === companyId);
    if (!obra || obra.status === 'encerrada') return Promise.resolve({ count: 0 });
    obra.status = 'encerrada';
    return Promise.resolve({ count: 1 });
  }

  findAuditLogsForObra(_obraId: string, _companyId: string) {
    return Promise.resolve([]);
  }

  findUsersByIds(_userIds: string[], _companyId: string) {
    return Promise.resolve([]);
  }

  findManyByCompany(companyId: string) {
    return Promise.resolve(this.obras.filter((o) => o.companyId === companyId));
  }

  findEligibleContracts() {
    return Promise.resolve([]);
  }

  findContractByIdForCompany() {
    return Promise.resolve(null);
  }

  findObraByContractId() {
    return Promise.resolve(null);
  }

  create() {
    throw new Error('not implemented');
  }

  createVistoria(obraId: string, data: { type: string }) {
    const obra = this.obras.find((o) => o.id === obraId);
    obra?.vistorias.push({ type: data.type });
    return Promise.resolve({ id: 'v1', obraId, ...data });
  }

  createOccurrence() {
    throw new Error('not implemented');
  }

  resolveOccurrence() {
    throw new Error('not implemented');
  }

  findVistoriaForObra() {
    return Promise.resolve(null);
  }

  createNonConformity() {
    throw new Error('not implemented');
  }
}

describe('ObrasService steps and audit', () => {
  let repo: FakeObrasRepository;
  let service: ObrasService;

  beforeEach(() => {
    repo = new FakeObrasRepository();
    service = new ObrasService(repo);
  });

  it('creates a custom step with title and description', async () => {
    const step = await service.createStep('obra-1', 'co-1', 'user-1', {
      title: 'Instalação elétrica',
      description: 'Primeira fase',
    });
    expect(step.title).toBe('Instalação elétrica');
    expect(step.description).toBe('Primeira fase');
  });

  it('reorders steps when all ids are provided', async () => {
    const obra = repo.obras[0];
    const reversed = [...obra.steps].reverse().map((s) => s.id);
    await service.reorderSteps('obra-1', 'co-1', 'user-1', { stepIds: reversed });
    expect(obra.steps[0].id).toBe(reversed[0]);
  });

  it('blocks step creation on closed obra', async () => {
    repo.obras[0].status = 'encerrada';
    await expect(
      service.createStep('obra-1', 'co-1', 'user-1', { title: 'Nova etapa' }),
    ).rejects.toBeInstanceOf(AppError);
  });

  it('logs audit when adding direct custo', async () => {
    const { logAudit } = await import('../../middleware/audit.js');
    await service.addCusto('obra-1', 'co-1', 'user-1', {
      category: ObraCostCategory.COMBUSTIVEL,
      description: 'Abastecimento caminhão obra',
      amount: 500,
    });
    expect(logAudit).toHaveBeenCalledWith(
      'co-1',
      'user-1',
      'OBRA_CUSTO_CREATE',
      'Obra',
      'obra-1',
      expect.objectContaining({ category: ObraCostCategory.COMBUSTIVEL }),
    );
  });

  it('rejects direct custo when category requires purchase order', async () => {
    await expect(
      service.addCusto('obra-1', 'co-1', 'user-1', {
        category: ObraCostCategory.COMPRA_MATERIAL,
        description: 'Tentativa de lançar material direto',
        amount: 500,
      }),
    ).rejects.toMatchObject({ code: 'PO_REQUIRED' });
  });

  it('blocks close without INICIAL and FINAL vistorias', async () => {
    await expect(service.closeObra('obra-1', 'co-1', 'user-1')).rejects.toMatchObject({
      code: 'OBRA_CLOSE_BLOCKED',
    });
  });

  it('logs audit when closing obra with required vistorias', async () => {
    const { logAudit } = await import('../../middleware/audit.js');
    repo.obras[0].vistorias = [
      { type: VistoriaType.INICIAL },
      { type: VistoriaType.FINAL },
    ];
    await service.closeObra('obra-1', 'co-1', 'user-1');
    expect(logAudit).toHaveBeenCalledWith(
      'co-1',
      'user-1',
      'OBRA_CLOSE',
      'Obra',
      'obra-1',
      expect.objectContaining({ name: 'Obra Teste' }),
    );
  });
});
