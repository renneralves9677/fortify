import { describe, it, expect, beforeEach } from 'vitest';
import { PurchaseRequestsService } from './purchase-requests.service.js';
import type { PurchaseRequestsRepository } from './purchase-requests.repository.js';

class FakePurchaseRequestsRepository implements Partial<PurchaseRequestsRepository> {
  findByIdForCompany() {
    return Promise.resolve(null);
  }
}

describe('PurchaseRequestsService', () => {
  let service: PurchaseRequestsService;

  beforeEach(() => {
    service = new PurchaseRequestsService(
      new FakePurchaseRequestsRepository() as PurchaseRequestsRepository,
    );
  });

  it('throws when purchase request not found on status update', async () => {
    await expect(
      service.updateStatus('pr-1', 'co-1', { status: 'APROVADA' }),
    ).rejects.toMatchObject({ code: 'PR_NOT_FOUND' });
  });
});
