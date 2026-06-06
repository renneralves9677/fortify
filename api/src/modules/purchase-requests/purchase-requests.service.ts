import { AppError } from '../../core/errors/AppError.js';
import { withPrismaError } from '../../core/errors/prisma-mapper.js';
import type {
  CreatePurchaseRequestInput,
  UpdatePurchaseRequestStatusInput,
} from './purchase-requests.schema.js';
import { PurchaseRequestsRepository } from './purchase-requests.repository.js';

export class PurchaseRequestsService {
  constructor(private readonly purchaseRequestsRepository: PurchaseRequestsRepository) {}

  async list(companyId: string) {
    const items = await this.purchaseRequestsRepository.findManyByCompany(companyId);
    return items.map((i) => ({ ...i, amount: Number(i.amount) }));
  }

  async create(companyId: string, input: CreatePurchaseRequestInput) {
    const item = await withPrismaError(() =>
      this.purchaseRequestsRepository.create({
        company: { connect: { id: companyId } },
        description: input.description,
        amount: input.amount,
      }),
    );
    return { ...item, amount: Number(item.amount) };
  }

  async updateStatus(id: string, companyId: string, input: UpdatePurchaseRequestStatusInput) {
    const item = await this.purchaseRequestsRepository.findByIdForCompany(id, companyId);
    if (!item) {
      throw new AppError(404, 'Solicitação não encontrada', 'PR_NOT_FOUND');
    }
    const updated = await this.purchaseRequestsRepository.update(id, { status: input.status });
    return { ...updated, amount: Number(updated.amount) };
  }
}
