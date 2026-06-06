import { Router } from 'express';
import { asyncHandler } from '../../core/http/async-handler.js';
import { LegalController } from './legal.controller.js';

const legalController = new LegalController();
const router = Router();

router.get('/versions', asyncHandler((_req, res) => legalController.getVersions(_req, res)));

export default router;
