import type { Response } from 'express';
import { parseBody, parseQuery } from '../../core/errors/zod-mapper.js';
import type { AuthRequest } from '../../middleware/auth.js';
import { createUserSchema, listUsersQuerySchema, updateUserSchema } from './users.schema.js';
import type { UsersService } from './users.service.js';

export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  private actor(req: AuthRequest) {
    return { userId: req.user!.userId, role: req.user!.role };
  }

  async list(req: AuthRequest, res: Response): Promise<void> {
    const query = parseQuery(listUsersQuerySchema, req.query);
    const users = await this.usersService.listUsersForCompany(req.companyId!, query);
    res.json(users);
  }

  async create(req: AuthRequest, res: Response): Promise<void> {
    const input = parseBody(createUserSchema, req.body);
    const user = await this.usersService.createUserForCompany(req.companyId!, this.actor(req), input);
    res.status(201).json(user);
  }

  async update(req: AuthRequest, res: Response): Promise<void> {
    const input = parseBody(updateUserSchema, req.body);
    const user = await this.usersService.updateUserForCompany(
      req.companyId!,
      this.actor(req),
      String(req.params.id),
      input,
    );
    res.json(user);
  }

  async remove(req: AuthRequest, res: Response): Promise<void> {
    const user = await this.usersService.deleteUserForCompany(
      req.companyId!,
      this.actor(req),
      String(req.params.id),
    );
    res.json(user);
  }
}
