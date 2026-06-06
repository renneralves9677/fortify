import { Router } from 'express';
import { asyncHandler } from '../../core/http/async-handler.js';
import { authMiddleware, requireAdmin } from '../../middleware/auth.js';
import { tenantMiddleware } from '../../middleware/tenant.js';
import { ContractsRepository } from './contracts.repository.js';
import { ContractsService } from './contracts.service.js';
import { ContractsController } from './contracts.controller.js';

const contractsRepository = new ContractsRepository();
const contractsService = new ContractsService(contractsRepository);
const contractsController = new ContractsController(contractsService);

const router = Router();
router.use(authMiddleware, tenantMiddleware);

router.get('/', asyncHandler((req, res) => contractsController.list(req, res)));
router.get('/manager', asyncHandler((req, res) => contractsController.listManager(req, res)));
router.get('/:id', asyncHandler((req, res) => contractsController.getById(req, res)));
router.get('/:id/preview', asyncHandler((req, res) => contractsController.preview(req, res)));

router.post(
  '/',
  requireAdmin,
  asyncHandler((req, res) => contractsController.create(req, res)),
);

router.patch(
  '/:id',
  requireAdmin,
  asyncHandler((req, res) => contractsController.update(req, res)),
);

router.post(
  '/:id/renew',
  requireAdmin,
  asyncHandler((req, res) => contractsController.renew(req, res)),
);

router.post(
  '/:id/close',
  requireAdmin,
  asyncHandler((req, res) => contractsController.close(req, res)),
);

router.post(
  '/:id/addendum',
  requireAdmin,
  asyncHandler((req, res) => contractsController.addendum(req, res)),
);

router.post(
  '/:id/transition',
  requireAdmin,
  asyncHandler((req, res) => contractsController.transition(req, res)),
);

router.get(
  '/:id/versions/compare',
  asyncHandler((req, res) => contractsController.compareVersions(req, res)),
);

router.get(
  '/:id/versions',
  asyncHandler((req, res) => contractsController.listVersions(req, res)),
);

export default router;
