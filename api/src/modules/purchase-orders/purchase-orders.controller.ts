import type { Response } from 'express';
import { parseBody } from '../../core/errors/zod-mapper.js';
import type { AuthRequest } from '../../middleware/auth.js';
import { logAudit } from '../../middleware/audit.js';
import {
  createPurchaseOrderSchema,
  receivePurchaseOrderSchema,
} from './purchase-orders.schema.js';
import type { PurchaseOrdersService } from './purchase-orders.service.js';

export class PurchaseOrdersController {
  constructor(private readonly purchaseOrdersService: PurchaseOrdersService) {}

  async list(req: AuthRequest, res: Response): Promise<void> {
    const orders = await this.purchaseOrdersService.listOrders(req.companyId!);
    res.json(orders);
  }

  async create(req: AuthRequest, res: Response): Promise<void> {
    const input = parseBody(createPurchaseOrderSchema, req.body);
    const order = await this.purchaseOrdersService.createOrder(
      req.companyId!,
      req.user?.userId,
      input,
    );

    await logAudit(req.companyId!, req.user?.userId, 'OBRA_OC_CREATE', 'Obra', input.obraId, {
      orderId: order.id,
      number: order.number,
      amount: order.amount,
      description: order.description,
    });

    res.status(201).json(order);
  }

  async approve(req: AuthRequest, res: Response): Promise<void> {
    const order = await this.purchaseOrdersService.approveOrder(
      String(req.params.id),
      req.companyId!,
      req.user?.userId,
      req.user!.role,
    );

    await logAudit(req.companyId!, req.user?.userId, 'OBRA_OC_APPROVE', 'Obra', order.obraId, {
      orderId: order.id,
      number: order.number,
      amount: order.amount,
    });

    res.json(order);
  }

  async receive(req: AuthRequest, res: Response): Promise<void> {
    const input = parseBody(receivePurchaseOrderSchema, req.body);
    const { order, custoId } = await this.purchaseOrdersService.receiveOrder(
      String(req.params.id),
      req.companyId!,
      req.user?.userId,
      req.user!.role,
      input,
    );

    await logAudit(req.companyId!, req.user?.userId, 'OBRA_CUSTO_CREATE', 'Obra', order.obraId, {
      custoId,
      orderId: order.id,
      number: order.number,
      amount: input.amount,
      source: 'purchase_order_receive',
    });

    await logAudit(req.companyId!, req.user?.userId, 'OBRA_OC_RECEIVE', 'Obra', order.obraId, {
      orderId: order.id,
      number: order.number,
      receivedAmount: input.amount,
      totalReceived: order.receivedAmount,
    });

    res.json(order);
  }
}
