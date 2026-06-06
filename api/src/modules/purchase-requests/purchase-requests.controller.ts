import type { Response } from 'express';
import { parseBody } from '../../core/errors/zod-mapper.js';
import type { AuthRequest } from '../../middleware/auth.js';
import {
  createPurchaseRequestSchema,
  updatePurchaseRequestStatusSchema,
} from './purchase-requests.schema.js';
import type { PurchaseRequestsService } from './purchase-requests.service.js';

export class PurchaseRequestsController {
  constructor(private readonly purchaseRequestsService: PurchaseRequestsService) {}

  async list(req: AuthRequest, res: Response): Promise<void> {
    const items = await this.purchaseRequestsService.list(req.companyId!);
    res.json(items);
  }

  async create(req: AuthRequest, res: Response): Promise<void> {
    const input = parseBody(createPurchaseRequestSchema, req.body);
    const item = await this.purchaseRequestsService.create(req.companyId!, input);
    res.status(201).json(item);
  }

  async updateStatus(req: AuthRequest, res: Response): Promise<void> {
    const input = parseBody(updatePurchaseRequestStatusSchema, req.body);
    const item = await this.purchaseRequestsService.updateStatus(
      String(req.params.id),
      req.companyId!,
      input,
    );
    res.json(item);
  }
}
