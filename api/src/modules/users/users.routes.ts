import { Router } from 'express';
import { asyncHandler } from '../../core/http/async-handler.js';
import { authMiddleware, requireAdmin } from '../../middleware/auth.js';
import { tenantMiddleware } from '../../middleware/tenant.js';
import { UsersRepository } from './users.repository.js';
import { UsersService } from './users.service.js';
import { UsersController } from './users.controller.js';

const usersRepository = new UsersRepository();
const usersService = new UsersService(usersRepository);
const usersController = new UsersController(usersService);

const router = Router();
router.use(authMiddleware, tenantMiddleware);

router.get('/', requireAdmin, asyncHandler((req, res) => usersController.list(req, res)));

router.post('/', requireAdmin, asyncHandler((req, res) => usersController.create(req, res)));

router.patch('/:id', requireAdmin, asyncHandler((req, res) => usersController.update(req, res)));

router.delete('/:id', requireAdmin, asyncHandler((req, res) => usersController.remove(req, res)));

export default router;
