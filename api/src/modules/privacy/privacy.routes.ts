import { Router } from 'express';
import { asyncHandler } from '../../core/http/async-handler.js';
import { authMiddleware } from '../../middleware/auth.js';
import { tenantMiddleware } from '../../middleware/tenant.js';
import { PrivacyRepository } from './privacy.repository.js';
import { PrivacyService } from './privacy.service.js';
import { PrivacyController } from './privacy.controller.js';

const privacyRepository = new PrivacyRepository();
const privacyService = new PrivacyService(privacyRepository);
const privacyController = new PrivacyController(privacyService);

const router = Router();
router.use(authMiddleware, tenantMiddleware);

router.get('/me', asyncHandler((req, res) => privacyController.me(req, res)));
router.get('/config', asyncHandler((req, res) => privacyController.config(req, res)));
router.get('/export', asyncHandler((req, res) => privacyController.exportData(req, res)));

export default router;
