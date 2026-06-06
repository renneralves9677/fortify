import { prisma } from '../../core/database/prisma.js';
import type { Prisma } from '@prisma/client';

export class PurchaseRequestsRepository {
  findManyByCompany(companyId: string) {
    return prisma.purchaseRequest.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
    });
  }

  create(data: Prisma.PurchaseRequestCreateInput) {
    return prisma.purchaseRequest.create({ data });
  }

  findByIdForCompany(id: string, companyId: string) {
    return prisma.purchaseRequest.findFirst({ where: { id, companyId } });
  }

  update(id: string, data: Prisma.PurchaseRequestUpdateInput) {
    return prisma.purchaseRequest.update({ where: { id }, data });
  }
}
