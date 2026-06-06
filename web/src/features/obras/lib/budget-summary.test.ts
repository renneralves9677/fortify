import { describe, expect, it } from 'vitest';
import { computeBudgetSummary, computeCommittedFromOrders } from '@features/obras/lib/budget-summary';

describe('budget-summary', () => {
  it('returns none status when planned is zero', () => {
    const s = computeBudgetSummary({
      budgetPlanned: 0,
      budgetRealized: 500,
      custos: [{ id: '1', category: 'COMBUSTIVEL', description: 'x', amount: 500, date: '2025-01-15' }],
    });
    expect(s.status).toBe('none');
    expect(s.planned).toBe(0);
    expect(s.realized).toBe(500);
  });

  it('computes ok status below 80% projected', () => {
    const s = computeBudgetSummary({
      budgetPlanned: 10000,
      budgetRealized: 5000,
    });
    expect(s.status).toBe('ok');
    expect(s.projectedPct).toBe(50);
    expect(s.available).toBe(5000);
  });

  it('computes warning between 80% and 100%', () => {
    const s = computeBudgetSummary({
      budgetPlanned: 10000,
      budgetRealized: 8500,
    });
    expect(s.status).toBe('warning');
    expect(s.projectedPct).toBe(85);
  });

  it('computes over when projected exceeds planned', () => {
    const s = computeBudgetSummary({
      budgetPlanned: 10000,
      budgetRealized: 11000,
    });
    expect(s.status).toBe('over');
    expect(s.available).toBe(-1000);
    expect(s.projectedPctGauge).toBe(100);
  });

  it('sums committed from approved purchase orders', () => {
    const committed = computeCommittedFromOrders([
      {
        id: 'po-1',
        number: 'OC-001',
        payerCnpj: '12345678000199',
        description: 'Material',
        amount: 3000,
        receivedAmount: 1000,
        status: 'RECEBIDA_PARCIAL',
      },
      {
        id: 'po-2',
        number: 'OC-002',
        payerCnpj: '12345678000199',
        description: 'Serviço',
        amount: 2000,
        receivedAmount: 0,
        status: 'APROVADA',
      },
      {
        id: 'po-3',
        number: 'OC-003',
        payerCnpj: '12345678000199',
        description: 'Emitida',
        amount: 5000,
        receivedAmount: 0,
        status: 'EMITIDA',
      },
    ]);
    expect(committed).toBe(4000);

    const s = computeBudgetSummary({
      budgetPlanned: 10000,
      budgetRealized: 2000,
      purchaseOrders: [
        {
          id: 'po-2',
          number: 'OC-002',
          payerCnpj: '12345678000199',
          description: 'Serviço',
          amount: 2000,
          receivedAmount: 0,
          status: 'APROVADA',
        },
      ],
    });
    expect(s.committed).toBe(2000);
    expect(s.projected).toBe(4000);
    expect(s.available).toBe(6000);
  });

  it('aggregates by category and month', () => {
    const s = computeBudgetSummary({
      budgetPlanned: 5000,
      budgetRealized: 1500,
      custos: [
        {
          id: '1',
          category: 'COMBUSTIVEL',
          categoryLabel: 'Combustível',
          description: 'Posto',
          amount: 1000,
          date: '2025-03-10',
        },
        {
          id: '2',
          category: 'PEDAGIO',
          categoryLabel: 'Pedágio',
          description: 'BR-101',
          amount: 500,
          date: '2025-03-20',
        },
      ],
    });
    expect(s.byCategory).toHaveLength(2);
    expect(s.byCategory[0].label).toBe('Combustível');
    expect(s.byMonth).toHaveLength(1);
    expect(s.byMonth[0].amount).toBe(1500);
  });
});
