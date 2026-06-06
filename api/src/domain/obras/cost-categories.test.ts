import { afterEach, describe, expect, it } from 'vitest';
import { ObraCostCategory } from '@prisma/client';
import {
  getPoApprovalThreshold,
  isDirectCostAllowed,
  requiresPoApproval,
} from './cost-categories.js';

describe('cost-categories', () => {
  afterEach(() => {
    delete process.env.PO_APPROVAL_THRESHOLD;
  });

  it('marks purchase-order categories correctly', () => {
    expect(isDirectCostAllowed(ObraCostCategory.COMPRA_MATERIAL)).toBe(false);
    expect(isDirectCostAllowed(ObraCostCategory.COMBUSTIVEL)).toBe(true);
  });

  it('uses PO_APPROVAL_THRESHOLD from env', () => {
    process.env.PO_APPROVAL_THRESHOLD = '10000';
    expect(getPoApprovalThreshold()).toBe(10000);
    expect(requiresPoApproval(9999)).toBe(false);
    expect(requiresPoApproval(10000)).toBe(true);
  });
});
