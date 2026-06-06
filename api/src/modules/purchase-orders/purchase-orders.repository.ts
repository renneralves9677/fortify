import { prisma } from '../../core/database/prisma.js';
import type { Prisma } from '@prisma/client';

export class PurchaseOrdersRepository {
  findManyByCompany(companyId: string) {
    return prisma.purchaseOrder.findMany({
      where: { companyId },
      include: { obra: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  findObraByIdForCompany(obraId: string, companyId: string) {
    return prisma.obra.findFirst({ where: { id: obraId, companyId }, select: { id: true, status: true } });
  }

  findStepForObra(stepId: string, obraId: string, companyId: string) {
    return prisma.obraStep.findFirst({
      where: { id: stepId, obraId, obra: { companyId } },
    });
  }

  countByCompany(companyId: string) {
    return prisma.purchaseOrder.count({ where: { companyId } });
  }

  create(data: Prisma.PurchaseOrderCreateInput) {
    return prisma.purchaseOrder.create({
      data,
      include: { obra: { select: { id: true, name: true, status: true } } },
    });
  }

  findByIdForCompany(id: string, companyId: string) {
    return prisma.purchaseOrder.findFirst({
      where: { id, companyId },
      include: { obra: { select: { id: true, name: true, status: true } } },
    });
  }

  update(id: string, data: Prisma.PurchaseOrderUpdateInput) {
    return prisma.purchaseOrder.update({ where: { id }, data });
  }

  receiveWithCusto(
    orderId: string,
    data: {
      receivedAmount: number;
      status: Prisma.PurchaseOrderUpdateInput['status'];
      custo: {
        obraId: string;
        category: Prisma.ObraCustoCreateWithoutObraInput['category'];
        description: string;
        amount: number;
        purchaseOrderId: string;
      };
    },
  ) {
    return prisma.$transaction(async (tx) => {
      const order = await tx.purchaseOrder.update({
        where: { id: orderId },
        data: {
          receivedAmount: data.receivedAmount,
          status: data.status,
        },
      });
      const custo = await tx.obraCusto.create({
        data: {
          obraId: data.custo.obraId,
          category: data.custo.category,
          description: data.custo.description,
          amount: data.custo.amount,
          purchaseOrderId: data.custo.purchaseOrderId,
          date: new Date(),
        },
      });
      return { order, custoId: custo.id };
    });
  }
}
