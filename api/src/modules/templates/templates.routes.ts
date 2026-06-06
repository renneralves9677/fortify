import { Router } from 'express';
import { asyncHandler } from '../../core/http/async-handler.js';
import { authMiddleware, requireAdmin } from '../../middleware/auth.js';
import { tenantMiddleware } from '../../middleware/tenant.js';
import { TemplatesRepository } from './templates.repository.js';
import { TemplatesService } from './templates.service.js';
import { TemplatesController } from './templates.controller.js';

const templatesRepository = new TemplatesRepository();
const templatesService = new TemplatesService(templatesRepository);
const templatesController = new TemplatesController(templatesService);

const router = Router();
router.use(authMiddleware, tenantMiddleware);

router.get('/', asyncHandler((req, res) => templatesController.list(req, res)));

router.get('/catalog/defaults', asyncHandler((req, res) => templatesController.listDefaults(req, res)));

router.get(
  '/catalog/defaults/:key',
  asyncHandler((req, res) => templatesController.getDefaultPreset(req, res)),
);

router.post(
  '/preview',
  asyncHandler((req, res) => templatesController.preview(req, res)),
);

router.post(
  '/',
  requireAdmin,
  asyncHandler((req, res) => templatesController.create(req, res)),
);

router.post(
  '/from-preset',
  requireAdmin,
  asyncHandler((req, res) => templatesController.createFromPreset(req, res)),
);

router.post(
  '/ensure-defaults',
  requireAdmin,
  asyncHandler((req, res) => templatesController.ensureDefaults(req, res)),
);

router.get('/:id', asyncHandler((req, res) => templatesController.getById(req, res)));

router.patch(
  '/:id',
  requireAdmin,
  asyncHandler((req, res) => templatesController.update(req, res)),
);

router.get(
  '/:id/versions',
  asyncHandler((req, res) => templatesController.listVersions(req, res)),
);

router.get(
  '/:id/versions/:versionId',
  asyncHandler((req, res) => templatesController.getVersion(req, res)),
);

export default router;
