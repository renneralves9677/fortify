import { Router } from 'express';
import { asyncHandler } from '../../core/http/async-handler.js';
import { authMiddleware, requireAdmin } from '../../middleware/auth.js';
import { tenantMiddleware } from '../../middleware/tenant.js';
import { PurchaseOrdersRepository } from './purchase-orders.repository.js';
import { PurchaseOrdersService } from './purchase-orders.service.js';
import { PurchaseOrdersController } from './purchase-orders.controller.js';

const purchaseOrdersRepository = new PurchaseOrdersRepository();
const purchaseOrdersService = new PurchaseOrdersService(purchaseOrdersRepository);
const purchaseOrdersController = new PurchaseOrdersController(purchaseOrdersService);

const router = Router();
router.use(authMiddleware, tenantMiddleware);

router.get('/', asyncHandler((req, res) => purchaseOrdersController.list(req, res)));

router.post(
  '/',
  requireAdmin,
  asyncHandler((req, res) => purchaseOrdersController.create(req, res)),
);

router.post(
  '/:id/approve',
  requireAdmin,
  asyncHandler((req, res) => purchaseOrdersController.approve(req, res)),
);

router.post(
  '/:id/receive',
  requireAdmin,
  asyncHandler((req, res) => purchaseOrdersController.receive(req, res)),
);

export default router;
