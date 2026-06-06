import { Router } from 'express';
import { asyncHandler } from '../../core/http/async-handler.js';
import { authMiddleware, requireAdmin } from '../../middleware/auth.js';
import { tenantMiddleware } from '../../middleware/tenant.js';
import { ObrasRepository } from './obras.repository.js';
import { ObrasService } from './obras.service.js';
import { ObrasController } from './obras.controller.js';

const obrasRepository = new ObrasRepository();
const obrasService = new ObrasService(obrasRepository);
const obrasController = new ObrasController(obrasService);

const router = Router();
router.use(authMiddleware, tenantMiddleware);

router.get('/', asyncHandler((req, res) => obrasController.list(req, res)));

router.get(
  '/eligible-contracts',
  asyncHandler((req, res) => obrasController.listEligibleContracts(req, res)),
);

router.get(
  '/cost-categories',
  asyncHandler((req, res) => obrasController.listCostCategories(req, res)),
);

router.post(
  '/',
  requireAdmin,
  asyncHandler((req, res) => obrasController.create(req, res)),
);

router.get('/:id', asyncHandler((req, res) => obrasController.getById(req, res)));

router.patch(
  '/:id/budget',
  requireAdmin,
  asyncHandler((req, res) => obrasController.updateBudget(req, res)),
);

router.get(
  '/:id/audit',
  requireAdmin,
  asyncHandler((req, res) => obrasController.getAudit(req, res)),
);

router.get(
  '/:id/close-readiness',
  asyncHandler((req, res) => obrasController.getCloseReadiness(req, res)),
);

router.get(
  '/:id/report/preview',
  asyncHandler((req, res) => obrasController.getReportPreview(req, res)),
);

router.get(
  '/:id/report/html',
  asyncHandler((req, res) => obrasController.getReportHtml(req, res)),
);

router.get(
  '/:id/report/pdf',
  asyncHandler((req, res) => obrasController.getReportPdf(req, res)),
);

router.post(
  '/:id/close',
  requireAdmin,
  asyncHandler((req, res) => obrasController.close(req, res)),
);

router.post(
  '/:id/steps',
  requireAdmin,
  asyncHandler((req, res) => obrasController.createStep(req, res)),
);

router.put(
  '/:id/steps/reorder',
  requireAdmin,
  asyncHandler((req, res) => obrasController.reorderSteps(req, res)),
);

router.patch(
  '/:id/steps/:stepId',
  requireAdmin,
  asyncHandler((req, res) => obrasController.updateStep(req, res)),
);

router.delete(
  '/:id/steps/:stepId',
  requireAdmin,
  asyncHandler((req, res) => obrasController.deleteStep(req, res)),
);

router.post(
  '/:id/vistorias',
  requireAdmin,
  asyncHandler((req, res) => obrasController.addVistoria(req, res)),
);

router.post(
  '/:id/custos',
  requireAdmin,
  asyncHandler((req, res) => obrasController.addCusto(req, res)),
);

router.post(
  '/:id/occurrences',
  requireAdmin,
  asyncHandler((req, res) => obrasController.addOccurrence(req, res)),
);

router.post(
  '/:id/occurrences/:occurrenceId/resolve',
  requireAdmin,
  asyncHandler((req, res) => obrasController.resolveOccurrence(req, res)),
);

router.post(
  '/:id/non-conformities',
  requireAdmin,
  asyncHandler((req, res) => obrasController.addNonConformity(req, res)),
);

export default router;
