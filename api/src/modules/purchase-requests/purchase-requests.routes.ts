import { Router } from 'express';
import { asyncHandler } from '../../core/http/async-handler.js';
import { authMiddleware, requireAdmin } from '../../middleware/auth.js';
import { tenantMiddleware } from '../../middleware/tenant.js';
import { PurchaseRequestsRepository } from './purchase-requests.repository.js';
import { PurchaseRequestsService } from './purchase-requests.service.js';
import { PurchaseRequestsController } from './purchase-requests.controller.js';

const purchaseRequestsRepository = new PurchaseRequestsRepository();
const purchaseRequestsService = new PurchaseRequestsService(purchaseRequestsRepository);
const purchaseRequestsController = new PurchaseRequestsController(purchaseRequestsService);

const router = Router();
router.use(authMiddleware, tenantMiddleware);

router.get('/', asyncHandler((req, res) => purchaseRequestsController.list(req, res)));

router.post(
  '/',
  requireAdmin,
  asyncHandler((req, res) => purchaseRequestsController.create(req, res)),
);

router.patch(
  '/:id/status',
  requireAdmin,
  asyncHandler((req, res) => purchaseRequestsController.updateStatus(req, res)),
);

export default router;
