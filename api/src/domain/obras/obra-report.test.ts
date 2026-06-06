import { describe, it, expect } from 'vitest';
import { VistoriaType } from '@prisma/client';
import { buildObraReportHtml, buildObraReportModel } from './obra-report.js';

describe('buildObraReportModel', () => {
  it('groups vistorias by step and general bucket', async () => {
    const model = await buildObraReportModel(
      {
        id: 'obra-1',
        name: 'Obra A',
        status: 'ativa',
        budgetPlanned: 10000,
        steps: [
          { id: 'step-1', title: 'Etapa 1', done: true, sortOrder: 1, description: null },
        ],
        vistorias: [
          {
            id: 'v1',
            type: VistoriaType.INICIAL,
            description: 'Início',
            photoUrls: [],
            startedAt: new Date('2025-01-01'),
            endedAt: new Date('2025-01-01'),
            obraStepId: 'step-1',
          },
          {
            id: 'v2',
            type: VistoriaType.MANUTENCAO,
            description: 'Geral',
            photoUrls: [],
            startedAt: new Date('2025-02-01'),
            endedAt: new Date('2025-02-02'),
            obraStepId: null,
          },
        ],
        custos: [],
        purchaseOrders: [],
      },
      'co-1',
      { sections: ['vistorias'], groupByStep: true, draft: true },
    );

    const stepGroup = model.groups.find((g) => g.stepId === 'step-1');
    const general = model.groups.find((g) => g.stepId === null);
    expect(stepGroup?.vistorias).toHaveLength(1);
    expect(general?.vistorias).toHaveLength(1);
  });
});

describe('buildObraReportHtml', () => {
  it('includes draft watermark when draft is true', async () => {
    const model = await buildObraReportModel(
      {
        id: 'obra-1',
        name: 'Obra A',
        status: 'ativa',
        budgetPlanned: 0,
        steps: [],
        vistorias: [],
        custos: [],
        purchaseOrders: [],
      },
      'co-1',
      { sections: ['resumo'], groupByStep: false, draft: true },
    );
    const html = buildObraReportHtml(model);
    expect(html).toContain('Rascunho');
    expect(html).toContain('Obra A');
  });
});
