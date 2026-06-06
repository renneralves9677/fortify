import { describe, it, expect } from 'vitest';
import { computeContractStatus, daysUntil } from './contract-status.js';

describe('computeContractStatus', () => {
  it('promotes ASSINADO to ATIVO', () => {
    expect(computeContractStatus('ASSINADO', null)).toBe('ATIVO');
  });

  it('marks contract as ENCERRADO when end date passed', () => {
    const past = new Date(Date.now() - 86400000);
    expect(computeContractStatus('ATIVO', past)).toBe('ENCERRADO');
  });

  it('marks contract as VENCENDO within 30 days', () => {
    const soon = new Date(Date.now() + 10 * 86400000);
    expect(computeContractStatus('ATIVO', soon)).toBe('VENCENDO');
  });
});

describe('daysUntil', () => {
  it('returns null when no end date', () => {
    expect(daysUntil(null)).toBeNull();
  });

  it('returns positive days for future date', () => {
    const future = new Date(Date.now() + 5 * 86400000);
    expect(daysUntil(future)).toBeGreaterThan(0);
  });
});
