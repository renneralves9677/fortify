import { Router } from 'express';
import { asyncHandler } from '../../core/http/async-handler.js';
import { authMiddleware, requireAdmin } from '../../middleware/auth.js';
import { tenantMiddleware } from '../../middleware/tenant.js';
import { WorkflowRepository } from './workflow.repository.js';
import { WorkflowService } from './workflow.service.js';
import { WorkflowController } from './workflow.controller.js';

const workflowRepository = new WorkflowRepository();
const workflowService = new WorkflowService(workflowRepository);
const workflowController = new WorkflowController(workflowService);

const router = Router();
router.use(authMiddleware, tenantMiddleware);

router.post(
  '/contracts/:id/submit-revisao',
  requireAdmin,
  asyncHandler((req, res) => workflowController.submitRevisao(req, res)),
);

router.post(
  '/contracts/:id/submit-aprovacao',
  requireAdmin,
  asyncHandler((req, res) => workflowController.submitAprovacao(req, res)),
);

router.post(
  '/contracts/:id/approve-step',
  requireAdmin,
  asyncHandler((req, res) => workflowController.approveStep(req, res)),
);

router.post(
  '/contracts/:id/reject',
  requireAdmin,
  asyncHandler((req, res) => workflowController.reject(req, res)),
);

export default router;
