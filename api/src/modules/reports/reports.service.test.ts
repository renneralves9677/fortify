import { describe, it, expect, beforeEach } from 'vitest';
import { ReportsService } from './reports.service.js';
import type { ReportsRepository } from './reports.repository.js';

class FakeReportsRepository implements Partial<ReportsRepository> {
  getDashboardMetrics() {
    return Promise.resolve([
      [{ status: 'ATIVO', _count: 2 }],
      3,
      1,
      { _sum: { amount: 5000 } },
      { _sum: { value: { toString: () => '7500' } } },
    ] as never);
  }

  getDashboardPeriodData() {
    return Promise.resolve([
      [
        {
          createdAt: new Date('2026-01-10'),
          signedAt: new Date('2026-05-10'),
          startDate: new Date('2026-05-12'),
          value: { toString: () => '1000' },
          status: 'ATIVO',
        },
      ],
      [{ createdAt: new Date('2026-05-01'), budgetPlanned: { toString: () => '10000' } }],
      [{ date: new Date('2026-05-15'), amount: { toString: () => '500' }, category: 'COMBUSTIVEL' }],
      [{ amount: { toString: () => '200' }, receivedAmount: { toString: () => '0' }, status: 'APROVADA' }],
      { _sum: { budgetPlanned: { toString: () => '20000' } } },
    ] as never);
  }

  getExecutiveMetrics() {
    return Promise.resolve([2, 1, 3, 4] as never);
  }
}

describe('ReportsService', () => {
  let service: ReportsService;

  beforeEach(() => {
    service = new ReportsService(new FakeReportsRepository() as ReportsRepository);
  });

  it('aggregates dashboard metrics', async () => {
    const dashboard = await service.getDashboard('co-1', { months: 6 });
    expect(dashboard.contracts.ativos).toBe(2);
    expect(dashboard.contracts.totalValueActive).toBe(7500);
    expect(dashboard.contracts.totalValueInPeriod).toBe(1000);
    expect(dashboard.contracts.assinaturasPendentes).toBe(1);
    expect(dashboard.obras.ativas).toBe(3);
    expect(dashboard.obras.custoTotal).toBe(5000);
    expect(dashboard.obras.custoRealizado).toBe(500);
    expect(dashboard.obras.comprometido).toBe(200);
    expect(dashboard.contracts.monthly.length).toBe(6);
    expect(dashboard.alerts.pendingApprovals).toBe(2);
  });
});
