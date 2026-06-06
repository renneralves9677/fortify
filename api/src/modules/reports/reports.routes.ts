import { Router } from 'express';
import { asyncHandler } from '../../core/http/async-handler.js';
import { authMiddleware } from '../../middleware/auth.js';
import { tenantMiddleware } from '../../middleware/tenant.js';
import { ReportsRepository } from './reports.repository.js';
import { ReportsService } from './reports.service.js';
import { ReportsController } from './reports.controller.js';

const reportsRepository = new ReportsRepository();
const reportsService = new ReportsService(reportsRepository);
const reportsController = new ReportsController(reportsService);

const router = Router();
router.use(authMiddleware, tenantMiddleware);

router.get('/dashboard', asyncHandler((req, res) => reportsController.dashboard(req, res)));
router.get('/executive', asyncHandler((req, res) => reportsController.executive(req, res)));
router.get(
  '/report/contracts',
  asyncHandler((req, res) => reportsController.listContracts(req, res)),
);
router.get('/report/obras', asyncHandler((req, res) => reportsController.listObras(req, res)));
router.get(
  '/export/contracts',
  asyncHandler((req, res) => reportsController.exportContracts(req, res)),
);
router.get('/export/obras', asyncHandler((req, res) => reportsController.exportObras(req, res)));

export default router;
