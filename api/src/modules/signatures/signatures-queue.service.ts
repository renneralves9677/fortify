import { SignatureFlowStatus } from '@prisma/client';
import { paginatedResult, paginationBounds } from '../../shared/pagination.js';
import type { SignatureQueueQuery } from './signatures.schema.js';
import type { SignaturesRepositoryPort } from './signatures.repository.port.js';
import { serializeFlow } from './signatures-shared.js';

export class SignaturesQueueService {
  constructor(private readonly repo: SignaturesRepositoryPort) {}

  async getPendingQueue(companyId: string, query: SignatureQueueQuery) {
    const { page, pageSize, search, status, progress } = query;
    const { skip, take } = paginationBounds(page, pageSize);
    const statusFilter =
      status === 'ALL' ? ('ALL' as const) : status ?? SignatureFlowStatus.IN_PROGRESS;
    const queueFilters = { search, status: statusFilter, progress };
    const [flows, total] = await Promise.all([
      this.repo.findActiveFlowsQueue(companyId, { ...queueFilters, skip, take }),
      this.repo.countActiveFlowsQueue(companyId, queueFilters),
    ]);
    return paginatedResult(
      flows.map((flow) => serializeFlow(flow)),
      total,
      page,
      pageSize,
    );
  }
}
