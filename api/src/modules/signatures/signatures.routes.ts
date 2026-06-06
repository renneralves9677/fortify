import { Router } from 'express';
import { asyncHandler } from '../../core/http/async-handler.js';
import { authMiddleware, requireAdmin } from '../../middleware/auth.js';
import { signatureOtpLimiter } from '../../middleware/rate-limit.js';
import { tenantMiddleware } from '../../middleware/tenant.js';
import { SignaturesRepository } from './signatures.repository.js';
import { SignaturesService } from './signatures.service.js';
import { SignaturesController } from './signatures.controller.js';

const signaturesRepository = new SignaturesRepository();
const signaturesService = new SignaturesService(signaturesRepository);
const signaturesController = new SignaturesController(signaturesService);

const router = Router();
const protectedRouter = Router();
const publicRouter = Router();

protectedRouter.use(authMiddleware, tenantMiddleware);

protectedRouter.get('/queue', asyncHandler((req, res) => signaturesController.queue(req, res)));

protectedRouter.post(
  '/contracts/:contractId/send',
  requireAdmin,
  asyncHandler((req, res) => signaturesController.send(req, res)),
);

protectedRouter.post(
  '/contracts/:contractId/flows',
  requireAdmin,
  asyncHandler((req, res) => signaturesController.createFlow(req, res)),
);

protectedRouter.get(
  '/contracts/:contractId/flow',
  asyncHandler((req, res) => signaturesController.getContractFlow(req, res)),
);

protectedRouter.get('/flows/:flowId', asyncHandler((req, res) => signaturesController.getFlow(req, res)));

protectedRouter.get(
  '/flows/:flowId/timeline',
  asyncHandler((req, res) => signaturesController.getFlowTimeline(req, res)),
);

protectedRouter.post(
  '/flows/:flowId/cancel',
  requireAdmin,
  asyncHandler((req, res) => signaturesController.cancelFlow(req, res)),
);

protectedRouter.get(
  '/history/:contractId',
  asyncHandler((req, res) => signaturesController.history(req, res)),
);

protectedRouter.get(
  '/contracts/:contractId/documents/signed',
  asyncHandler((req, res) => signaturesController.downloadSignedDocument(req, res)),
);

publicRouter.get('/:token', asyncHandler((req, res) => signaturesController.getPublic(req, res)));
publicRouter.get('/:token/pdf', asyncHandler((req, res) => signaturesController.getPublicPdf(req, res)));
publicRouter.get(
  '/:token/receipt',
  asyncHandler((req, res) => signaturesController.getPublicReceipt(req, res)),
);
publicRouter.get(
  '/:token/signed-pdf',
  asyncHandler((req, res) => signaturesController.getPublicSignedPdf(req, res)),
);
publicRouter.post(
  '/:token/consent',
  asyncHandler((req, res) => signaturesController.consentPublic(req, res)),
);
publicRouter.post(
  '/:token/otp/send',
  signatureOtpLimiter,
  asyncHandler((req, res) => signaturesController.sendOtpPublic(req, res)),
);
publicRouter.post(
  '/:token/otp/verify',
  signatureOtpLimiter,
  asyncHandler((req, res) => signaturesController.verifyOtpPublic(req, res)),
);
publicRouter.post(
  '/:token/sign',
  signatureOtpLimiter,
  asyncHandler((req, res) => signaturesController.signPublic(req, res)),
);

router.use('/', protectedRouter);
router.use('/public', publicRouter);

export default router;
