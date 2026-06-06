import { ObraCostCategory, PurchaseOrderStatus } from '@prisma/client';
import { AppError } from '../../core/errors/AppError.js';
import { withPrismaError } from '../../core/errors/prisma-mapper.js';
import {
  getCategoryLabel,
  getPoApprovalThreshold,
  isAdminRole,
  requiresPoApproval,
} from '../../domain/obras/cost-categories.js';
import type {
  CreatePurchaseOrderInput,
  ReceivePurchaseOrderInput,
} from './purchase-orders.schema.js';
import { PurchaseOrdersRepository } from './purchase-orders.repository.js';

function assertObraActiveForOrder(obra: { status: string }) {
  if (obra.status === 'encerrada') {
    throw new AppError(400, 'Obra encerrada — operação não permitida', 'OBRA_CLOSED');
  }
}

function serializeOrder(
  order: Awaited<ReturnType<PurchaseOrdersRepository['findByIdForCompany']>>,
) {
  if (!order) return null;
  const amount = Number(order.amount);
  return {
    ...order,
    amount,
    receivedAmount: Number(order.receivedAmount),
    categoryLabel: getCategoryLabel(order.category),
    requiresApproval: requiresPoApproval(amount),
    poApprovalThreshold: getPoApprovalThreshold(),
  };
}

export class PurchaseOrdersService {
  constructor(private readonly purchaseOrdersRepository: PurchaseOrdersRepository) {}

  async listOrders(companyId: string) {
    const orders = await this.purchaseOrdersRepository.findManyByCompany(companyId);
    return orders.map((o) => {
      const amount = Number(o.amount);
      return {
        ...o,
        amount,
        receivedAmount: Number(o.receivedAmount),
        categoryLabel: getCategoryLabel(o.category),
        requiresApproval: requiresPoApproval(amount),
        poApprovalThreshold: getPoApprovalThreshold(),
      };
    });
  }

  async createOrder(
    companyId: string,
    userId: string | undefined,
    input: CreatePurchaseOrderInput,
  ) {
    const obra = await this.purchaseOrdersRepository.findObraByIdForCompany(
      input.obraId,
      companyId,
    );
    if (!obra) {
      throw new AppError(404, 'Obra não encontrada', 'OBRA_NOT_FOUND');
    }
    assertObraActiveForOrder(obra);

    if (input.obraStepId) {
      const step = await this.purchaseOrdersRepository.findStepForObra(
        input.obraStepId,
        input.obraId,
        companyId,
      );
      if (!step) {
        throw new AppError(400, 'Etapa do roteiro inválida', 'STEP_NOT_FOUND');
      }
    }

    const needsApproval = requiresPoApproval(input.amount);
    const now = new Date();
    const count = await this.purchaseOrdersRepository.countByCompany(companyId);

    const order = await withPrismaError(() =>
      this.purchaseOrdersRepository.create({
        company: { connect: { id: companyId } },
        obra: { connect: { id: input.obraId } },
        number: `OC-${String(count + 1).padStart(5, '0')}`,
        category: input.category,
        payerCnpj: input.payerCnpj,
        description: input.description,
        amount: input.amount,
        obraStep: input.obraStepId ? { connect: { id: input.obraStepId } } : undefined,
        status: needsApproval ? PurchaseOrderStatus.EMITIDA : PurchaseOrderStatus.APROVADA,
        ...(!needsApproval
          ? { approvedAt: now, ...(userId ? { approvedById: userId } : {}) }
          : {}),
      }),
    );

    return serializeOrder(order)!;
  }

  async approveOrder(
    id: string,
    companyId: string,
    userId: string | undefined,
    role: string,
  ) {
    if (!isAdminRole(role)) {
      throw new AppError(403, 'Apenas administradores podem aprovar ordens de compra', 'FORBIDDEN');
    }

    const order = await this.purchaseOrdersRepository.findByIdForCompany(id, companyId);
    if (!order) {
      throw new AppError(404, 'Ordem não encontrada', 'PO_NOT_FOUND');
    }
    assertObraActiveForOrder(order.obra);

    const amount = Number(order.amount);
    if (!requiresPoApproval(amount)) {
      throw new AppError(
        400,
        'Esta ordem foi aprovada automaticamente e não exige aprovação manual',
        'PO_AUTO_APPROVED',
      );
    }
    if (order.status !== PurchaseOrderStatus.EMITIDA) {
      throw new AppError(400, 'Somente O.C. emitidas podem ser aprovadas', 'INVALID_PO_STATUS');
    }

    const updated = await this.purchaseOrdersRepository.update(id, {
      status: PurchaseOrderStatus.APROVADA,
      approvedAt: new Date(),
      ...(userId ? { approvedById: userId } : {}),
    });

    return serializeOrder({ ...order, ...updated })!;
  }

  async receiveOrder(
    id: string,
    companyId: string,
    userId: string | undefined,
    role: string,
    input: ReceivePurchaseOrderInput,
  ) {
    if (!isAdminRole(role)) {
      throw new AppError(
        403,
        'Apenas administradores podem registrar recebimento',
        'FORBIDDEN',
      );
    }

    const order = await this.purchaseOrdersRepository.findByIdForCompany(id, companyId);
    if (!order) {
      throw new AppError(404, 'Ordem não encontrada', 'PO_NOT_FOUND');
    }
    assertObraActiveForOrder(order.obra);
    if (
      order.status !== PurchaseOrderStatus.APROVADA &&
      order.status !== PurchaseOrderStatus.RECEBIDA_PARCIAL
    ) {
      throw new AppError(400, 'O.C. deve estar aprovada para recebimento', 'INVALID_PO_STATUS');
    }

    const newReceived = Number(order.receivedAmount) + input.amount;
    if (newReceived > Number(order.amount)) {
      throw new AppError(400, 'Valor recebido excede o total da O.C.', 'PO_OVER_RECEIVE');
    }

    const status =
      newReceived >= Number(order.amount)
        ? PurchaseOrderStatus.RECEBIDA
        : PurchaseOrderStatus.RECEBIDA_PARCIAL;

    const { order: updated, custoId } = await this.purchaseOrdersRepository.receiveWithCusto(id, {
      receivedAmount: newReceived,
      status,
      custo: {
        obraId: order.obraId,
        category: order.category,
        description: `${order.number} — ${order.description}`,
        amount: input.amount,
        purchaseOrderId: order.id,
      },
    });

    return { order: serializeOrder({ ...order, ...updated })!, custoId };
  }
}
