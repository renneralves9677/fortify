import { describe, it, expect } from 'vitest';
import {
  aggregateContractsMonthly,
  aggregateObrasMonthly,
  lastNMonthKeys,
  monthKeysFromRange,
} from './dashboard-aggregates.js';

describe('dashboard-aggregates', () => {
  it('aggregates contracts by month', () => {
    const months = ['2026-04', '2026-05', '2026-06'];
    const rows = [
      { createdAt: new Date('2026-05-10T12:00:00'), value: { toString: () => '1000' } },
      { createdAt: new Date('2026-05-20T12:00:00'), value: { toString: () => '500' } },
      { createdAt: new Date('2026-06-01T12:00:00'), value: { toString: () => '200' } },
    ];
    const result = aggregateContractsMonthly(rows, months);
    expect(result[1]).toEqual({
      month: '2026-05',
      label: expect.any(String),
      count: 2,
      value: 1500,
    });
    expect(result[0].count).toBe(0);
  });

  it('aggregates obra custos and counts by month', () => {
    const months = ['2026-05', '2026-06'];
    const custos = [{ date: new Date('2026-05-15'), amount: { toString: () => '300' } }];
    const obras = [{ createdAt: new Date('2026-06-02') }];
    const result = aggregateObrasMonthly(custos, obras, months);
    expect(result[0].custos).toBe(300);
    expect(result[1].obras).toBe(1);
  });

  it('builds last N month keys', () => {
    const keys = lastNMonthKeys(3, new Date('2026-06-15'));
    expect(keys).toEqual(['2026-04', '2026-05', '2026-06']);
  });

  it('builds month keys from explicit range', () => {
    const keys = monthKeysFromRange({ from: '2026-03-01', to: '2026-05-31' }, 6);
    expect(keys).toEqual(['2026-03', '2026-04', '2026-05']);
  });
});
